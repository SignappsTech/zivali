// Partner stats and leads (C14, FR-032). The partners.stats job (hourly) stores masked counts in
// partner_stats_snapshot; GET /v1/partners/stats serves the newest row. Leads come from the public form (captcha,
// rate limit in the route) and are emailed to LEADS_NOTIFY_EMAIL; their contact data never reaches a log.
import { z } from 'zod';

import type { CountValue, CursorQuery, LeadInput, PartnerStats } from '@zivali/types';

import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { AuditDao } from '../platform/index.ts';
import PartnersDao, { type RawCounts } from './partners.dao.ts';

const DAY_MS = 86_400_000;
const REUNION_DAYS = 90;
// Data inventory: snapshots are kept 90 days.
const SNAPSHOT_RETENTION_DAYS = 90;
const PAGE = 50;
const Flag = z.boolean();

/** Any value from 1 to 4 becomes '<5' (small numbers could point at a person); 0 stays 0. */
export function maskCount(n: number): CountValue {
	return n >= 1 && n <= 4 ? '<5' : n;
}

const METRICS = ['users', 'active_reports', 'reunions_90d'] as const;

/**
 * Complementary suppression: an exact total next to a '<5' region would give the masked value by subtraction. So per
 * metric, when any region is masked the total shown is (true total - the masked regions' counts + 3 per masked
 * region) rounded to the nearest 10. That equals unmasked regions + unlocated rows + a constant, so it does not
 * depend on any masked value (one masked region or several) and nothing can be derived. Otherwise it is exact.
 */
function maskTotal(total: number, regions: number[]): CountValue {
	const hidden = regions.filter((n) => n >= 1 && n <= 4);
	if (!hidden.length) return maskCount(total);
	const sum = hidden.reduce((a, b) => a + b, 0);
	return Math.round((total - sum + 3 * hidden.length) / 10) * 10 || '<5';
}

export function maskStats(totals: RawCounts, regions: (RawCounts & { region_slug: string })[]) {
	return {
		totals: Object.fromEntries(
			METRICS.map((m) => [
				m,
				maskTotal(
					totals[m],
					regions.map((r) => r[m])
				),
			])
		) as PartnerStats['totals'],
		by_region: regions.map(({ region_slug, ...c }) => ({
			region_slug,
			users: maskCount(c.users),
			active_reports: maskCount(c.active_reports),
			reunions_90d: maskCount(c.reunions_90d),
		})),
	};
}

/** Counts from the database only, masked (not stored). */
async function buildStats(ctx: Ctx): Promise<PartnerStats> {
	// Optional GA Data API enrichment (C14) is off; PartnerStats has no GA figures yet, so the stats stay DB-only.
	if (Flag.catch(false).parse(await configStore.get('partners.ga_enrichment')))
		ctx.logger.warn('partners.ga_enrichment is on but not available: stats stay DB-only');
	const since = new Date(ctx.now.getTime() - REUNION_DAYS * DAY_MS);
	const [totals, regions] = await Promise.all([
		PartnersDao.countTotals(since, ctx.tx),
		PartnersDao.countByRegion(since, ctx.tx),
	]);
	return {
		generated_at: ctx.now.toISOString(),
		pilot: Flag.catch(true).parse(await configStore.get('partners.pilot')),
		...maskStats(totals, regions),
	};
}

/** The partners.stats job: the masked counts, stored as the newest snapshot. */
export async function computeStats(_input: void, ctx: Ctx): Promise<PartnerStats> {
	const stats = await buildStats(ctx);
	await PartnersDao.insertSnapshot({ generated_at: ctx.now, data: stats }, ctx.tx);
	await PartnersDao.deleteSnapshotsBefore(new Date(ctx.now.getTime() - SNAPSHOT_RETENTION_DAYS * DAY_MS), ctx.tx);
	return stats;
}

/** The newest snapshot; before the job's first run (fresh database) it computes one without storing it (no racing writes). */
export async function getStats(_input: void, ctx: Ctx): Promise<unknown> {
	const latest = await PartnersDao.latestSnapshot(ctx.tx);
	return latest ? latest.data : buildStats(ctx);
}

const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function leadEmail(id: string, input: LeadInput) {
	const lines = [
		`Podjetje: ${input.company}`,
		`Kontakt: ${input.contact_name}`,
		`E-pošta: ${input.email}`,
		`Telefon: ${input.phone ?? '-'}`,
		`Regija: ${input.region_interest ?? '-'}`,
		`Zanimanje: ${input.interest}`,
		`Jezik: ${input.locale}`,
		'',
		input.message,
		'',
		`ID: ${id}`,
	];
	const text = lines.join('\n');
	return {
		subject: `Novo povpraševanje: ${input.company}`.replace(/\s+/g, ' '),
		text,
		html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
	};
}

/**
 * POST /v1/leads: captcha first (CAPTCHA_FAILED), then the lead with its consent time, then the notification email.
 * A failed email does not fail the request: the lead is stored and listed in the admin console.
 */
export async function createLead(input: LeadInput, ctx: Ctx): Promise<{ id: string }> {
	if (!(await ctx.adapters.captcha.verify(input.captcha_token))) throw new AppError('CAPTCHA_FAILED');
	const lead = await PartnersDao.insertLead(
		{
			company: input.company,
			contact_name: input.contact_name,
			email: input.email,
			phone: input.phone ?? null,
			region_interest: input.region_interest ?? null,
			interest: input.interest,
			message: input.message,
			consent_at: ctx.now,
		},
		ctx.tx
	);
	if (!config.LEADS_NOTIFY_EMAIL) {
		ctx.logger.warn({ lead_id: lead.id }, 'LEADS_NOTIFY_EMAIL is not set: lead not emailed');
		return lead;
	}
	try {
		await ctx.adapters.email.send({ to: config.LEADS_NOTIFY_EMAIL, ...leadEmail(lead.id, input) });
	} catch (err) {
		ctx.logger.error({ lead_id: lead.id, err }, 'lead notification email failed');
	}
	return lead;
}

/** GET /v1/admin/leads (admin, aal2): newest first, audited. */
export async function listLeads(input: CursorQuery, ctx: Ctx) {
	const limit = input.limit ?? PAGE;
	const rows = await PartnersDao.listLeads({ cursor: input.cursor, take: limit + 1 }, ctx.tx);
	await AuditDao.write(ctx.tx, {
		actor_id: ctx.actor?.user_id ?? null,
		action: 'admin.leads.list',
		target_type: 'lead',
	});
	const items = rows.slice(0, limit);
	return { items, next_cursor: rows.length > limit ? items[items.length - 1]!.id : null };
}

export default { maskCount, maskStats, computeStats, getStats, createLead, listLeads };
