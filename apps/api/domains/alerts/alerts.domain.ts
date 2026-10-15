// Nearby lost-pet alerts (C10, FR-010): the caller's own subscription, the spatial fan-out of a visible lost report
// and the gate notify.send asks before delivering a queued alert.
import type { AlertSubscriptionInput, DistanceBand, NotificationPayloads, Species } from '@zivali/types';
import { coarsenPoint } from '@zivali/validation/geo';

import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain, type NotificationInput } from '../notifications/index.ts';
import AlertsDao, { type AlertReport, type SubscriptionRow } from './alerts.dao.ts';

export type { SubscriptionRow };

/** Recipients per transaction (backend.md: fan-outs in chunks of at most 500). */
export const FANOUT_CHUNK = 500;

function actorId(ctx: Ctx): string {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor.user_id;
}

/** Visible lost reports that are still searching; closing or reuniting stops their alerts (C4 status machine). */
const isAlertable = (r: AlertReport) =>
	r.type === 'lost' && r.moderation_state === 'visible' && (r.status === 'open' || r.status === 'matched');

/** C6 distance bands; users never see a distance in metres. */
function distanceBand(metres: number): DistanceBand {
	if (metres < 1_000) return 'lt1';
	if (metres < 3_000) return '1to3';
	if (metres < 10_000) return '3to10';
	return 'gt10';
}

export async function getSubscription(_input: void, ctx: Ctx): Promise<SubscriptionRow | null> {
	return AlertsDao.getSubscription(actorId(ctx), ctx.tx);
}

/**
 * Create or replace the own subscription. The centre is coarsened once at write (C6 §Storage); the stored centre
 * sent back unchanged is kept, never coarsened again.
 */
export async function saveSubscription(input: AlertSubscriptionInput, ctx: Ctx): Promise<SubscriptionRow> {
	const user_id = actorId(ctx);
	const run = async (tx: Prisma.TransactionClient) => {
		const current = await AlertsDao.getSubscription(user_id, tx);
		const unchanged = current && input.center.lat === current.lat && input.center.lng === current.lng;
		await AlertsDao.upsertSubscription(
			user_id,
			{
				center: unchanged ? input.center : coarsenPoint(input.center),
				radius_km: input.radius_km,
				species: [...new Set(input.species)],
				paused: input.paused,
			},
			tx
		);
		return (await AlertsDao.getSubscription(user_id, tx))!;
	};
	return ctx.tx ? run(ctx.tx) : prisma.$transaction(run);
}

export async function deleteSubscription(_input: void, ctx: Ctx): Promise<void> {
	await AlertsDao.deleteSubscription(actorId(ctx), ctx.tx);
}

/**
 * alerts.fanout: one nearby_lost notification per matching subscriber, recorded in alert_deliveries in the same
 * transaction as its notify.send job, FANOUT_CHUNK recipients at a time. Idempotent: a retry skips users already
 * recorded. Returns the number of alerts queued.
 */
export async function fanout({ report_id }: { report_id: string }, ctx: Ctx): Promise<number> {
	const report = await AlertsDao.getAlertReport({ id: report_id }, ctx.tx);
	if (!report || !isAlertable(report)) return 0;
	const common = {
		report_code: report.short_code,
		species: report.species as Species,
		has_area: report.area_name !== null,
		...(report.area_name !== null && { area_name: report.area_name }),
		reported_at: report.created_at.toISOString(),
	};
	let queued = 0;
	for (;;) {
		const batch = await AlertsDao.findRecipients(report_id, FANOUT_CHUNK, ctx.tx);
		if (!batch.length) return queued;
		await prisma.$transaction(
			async (tx) => {
				const fresh = new Set(
					await AlertsDao.insertDeliveries(
						report_id,
						batch.map((r) => r.user_id),
						tx
					)
				);
				for (const { user_id, distance_m } of batch) {
					if (!fresh.has(user_id)) continue;
					const payload: NotificationPayloads['nearby_lost'] = {
						...common,
						distance_band: distanceBand(distance_m),
					};
					await NotificationsDomain.enqueueNotification(
						{ user_id, type: 'nearby_lost', payload, dedupe_key: `nearby:${report_id}` },
						{ ...ctx, tx }
					);
				}
				queued += fresh.size;
			},
			// One notify.send insert per recipient: well over the 5 s default on a loaded machine.
			{ timeout: 60_000 }
		);
	}
}

/**
 * notify.send asks this before delivering (C10): a queued nearby_lost alert is dropped once its report is closed,
 * reunited, hidden or gone, or the recipient's subscription is paused or deleted. Other types always pass.
 */
export async function shouldDeliver(input: NotificationInput, ctx: Ctx): Promise<boolean> {
	if (input.type !== 'nearby_lost') return true;
	const { report_code } = input.payload as { report_code?: unknown };
	if (typeof report_code !== 'string') return false;
	const report = await AlertsDao.getAlertReport({ short_code: report_code }, ctx.tx);
	return Boolean(report && isAlertable(report)) && (await AlertsDao.hasActiveSubscription(input.user_id, ctx.tx));
}

export default { getSubscription, saveSubscription, deleteSubscription, fanout, shouldDeliver };
