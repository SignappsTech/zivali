// Notifications (C10): producing (enqueueNotification → notify.send), delivering (deliver, the notify.send handler),
// the inbox, prefs and push tokens behind /v1, the signed one-click unsubscribe and the manage-link email.
import { createHash, timingSafeEqual } from 'node:crypto';

import type { z } from 'zod';

import { NOTIFICATION_TYPES, type Locale, type NotificationType, type Species } from '@zivali/types';
import { NotificationJobInput, Uuid } from '@zivali/validation';

import { config } from '../../lib/config.ts';
import { hashKey } from '../../lib/crypto.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { broadcast } from '../../lib/realtime.ts';
import { prisma } from '../../prisma/prisma.ts';
import NotificationsDao, { type RecipientRow } from './notifications.dao.ts';
import NotificationsMapper from './notifications.mapper.ts';
import { sources } from './sources.ts';
import { EMAIL_ONLY, normalize, renderEmail, renderPush, TYPES, webUrl, type Channel, type Vars } from './templates.ts';

export type NotificationInput = z.input<typeof NotificationJobInput>;
type JobInput = z.infer<typeof NotificationJobInput>;

export async function enqueueNotification(input: NotificationInput, ctx: Ctx): Promise<void> {
	// The payload lands in pgboss.job: ids and a template key only; anything else throws before it is stored.
	const job = NotificationJobInput.parse(input);
	// A deterministic id makes pg-boss refuse a duplicate (same user and dedupe_key) even with the inbox switched off.
	const id = job.dedupe_key ? uuidFrom(`notify:${job.user_id}:${job.dedupe_key}`) : undefined;
	await ctx.jobs.send('notify.send', job, { tx: ctx.tx, ...(id && { id }) });
}

// --- Delivery (notify.send) ---

const CHAT_EMAIL_DELAY_S = 30 * 60;
// Marks the chat email follow-up job (C10: chat email only after 30 minutes unread).
const FOLLOW_UP = 'email:';
// Until the client sets the support address (content slice Q10), replies go to the sender mailbox.
const supportEmail = () => config.EMAIL_FROM ?? 'podpora@najdimo.si';

const ljubljanaClock = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Ljubljana',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Minutes until the quiet hours end (Europe/Ljubljana wall clock), 0 outside them; the window is [from, to). */
export function quietMinutesLeft(quiet: { quiet_from: string | null; quiet_to: string | null }, now: Date): number {
	const { quiet_from: from, quiet_to: to } = quiet;
	if (!from || !to || !CLOCK.test(from) || !CLOCK.test(to) || from === to) return 0;
	const current = minutes(ljubljanaClock.format(now));
	const [start, end] = [minutes(from), minutes(to)];
	const inside = start < end ? current >= start && current < end : current >= start || current < end;
	return inside ? (end - current + 1440) % 1440 : 0;
}

const localeOf = (recipient: RecipientRow): Locale => (recipient.locale === 'en' ? 'en' : 'sl');
const emailHash = (address: string) => hashKey(`email:${address.trim().toLowerCase()}`);
/** Deterministic uuid from a key (pg-boss skips a job whose id exists). */
const uuidFrom = (key: string) =>
	createHash('sha256')
		.update(key)
		.digest('hex')
		.slice(0, 32)
		.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

/**
 * notify.send (C10): load the recipient, prefs and quiet hours (deferred to their end with startAfter), the type's
 * variables (sources.ts), then, in one transaction, the
 * inbox row (unique per user_id and dedupe_key; a duplicate stops here) with its `notification.created` broadcast
 * on `user:<id>`; after the commit push (Expo adapter) and email (Brevo adapter), each recorded, never retried.
 */
export async function deliver(data: unknown, ctx: Ctx): Promise<void> {
	const parsed = NotificationJobInput.safeParse(data);
	if (!parsed.success) {
		// Bad data stays bad: retrying cannot help.
		ctx.logger.error(
			{ issues: parsed.error.issues.map((i) => i.path.join('.')) },
			'notify.send: invalid job dropped'
		);
		return;
	}
	const input = parsed.data;
	const { type, user_id } = input;
	const spec = TYPES[type];
	if (type === 'nearby_lost' && !input.payload.report_id) {
		// The alerts fan-out records the one-per-report alert_deliveries row; without the id the source cannot resolve.
		ctx.logger.error({ type }, 'notify.send: nearby_lost without report_id dropped');
		return;
	}
	const recipient = await NotificationsDao.getRecipient(user_id);
	if (!recipient) {
		ctx.logger.info({ type }, 'notify.send: recipient has no profile, dropped');
		return;
	}
	const locale = localeOf(recipient);

	const left = spec.quiet ? quietMinutesLeft(recipient, ctx.now) : 0;
	if (left) {
		const startAfter = new Date(Math.floor(ctx.now.getTime() / 60_000) * 60_000 + left * 60_000);
		await ctx.jobs.send('notify.send', input, { startAfter });
		ctx.logger.info(
			{ type, start_after: startAfter.toISOString() },
			'notify.send: deferred to the end of quiet hours'
		);
		return;
	}

	const source = sources[type];
	if (!source) throw new Error(`notify.send: no variables source for ${type}`);
	const raw = await source(input.payload, { user_id, locale }, ctx);
	if (!raw) {
		ctx.logger.info({ type }, 'notify.send: no longer relevant, dropped');
		return;
	}
	const vars = normalize(type, raw);

	const followUp = type === 'chat_message' && !!input.dedupe_key?.startsWith(FOLLOW_UP);
	const pref = spec.prefs ? await NotificationsDao.getPref(user_id, type) : null;
	const on = (channel: Channel) =>
		spec.channels.includes(channel) && (pref ? pref[channel] : channel !== 'email' || spec.email_default !== false);
	const inApp = !followUp && on('in_app');
	const push = !followUp && on('push');
	const email = on('email');
	if (!inApp && !push && !email) return;

	// Inbox and push never carry the email-only fields (Vet Partner line, unsubscribe link).
	const payload = Object.fromEntries(Object.entries(vars).filter(([key]) => !EMAIL_ONLY.includes(key)));
	const fresh = await prisma.$transaction(async (tx) => {
		if (!inApp) return true;
		const row = await NotificationsDao.insertNotification(
			{ user_id, type, payload, dedupe_key: input.dedupe_key },
			tx
		);
		if (!row) return false;
		await broadcast(`user:${user_id}`, 'notification.created', NotificationsMapper.toNotificationDto(row), tx);
		return true;
	});
	if (!fresh) {
		ctx.logger.info({ type }, 'notify.send: already delivered');
		return;
	}

	if (push) await sendPush(user_id, type, payload, locale, ctx);
	// FR-010: only confirmed addresses (auth.users.email_confirmed_at) get email; anonymous finders have none here.
	if (!email || !recipient.email || !recipient.email_verified) return;
	if (type === 'chat_message' && !followUp) await scheduleChatEmail(input, ctx);
	else if (!followUp || Number(vars.unread_count) > 0)
		await sendNotificationEmail(recipient.id, recipient.email, type, vars, locale, ctx);
}

async function sendPush(user_id: string, type: NotificationType, payload: Vars, locale: Locale, ctx: Ctx) {
	const tokens = await NotificationsDao.listPushTokens(user_id);
	if (!tokens.length) return;
	const { title, body } = renderPush(type, payload, locale, ctx.now);
	const url = TYPES[type].link(payload);
	try {
		const results = await ctx.adapters.push.send(
			tokens.map(({ token }) => ({ to: token, title, body, data: { type, url } }))
		);
		const gone = tokens.filter((_, i) => {
			const result = results[i];
			return result?.status === 'error' && result.error === 'DeviceNotRegistered';
		});
		if (gone.length) await NotificationsDao.deletePushTokens({ tokens: gone.map((t) => t.token) });
		const failed = results.filter((r) => r.status === 'error').length;
		if (failed) ctx.logger.warn({ type, failed, removed: gone.length }, 'notify.send: push errors');
	} catch (err) {
		ctx.logger.warn({ err, type }, 'notify.send: push failed');
	}
}

/**
 * chat_message email (C10): after 30 minutes unread, once per unread streak. The follow-up job id is fixed by the
 * recipient's read marker, so later messages of the same streak do not add another one.
 */
async function scheduleChatEmail(input: JobInput, ctx: Ctx) {
	const thread_id = input.payload.thread_id;
	if (!thread_id) return;
	const lastRead = await NotificationsDao.getLastReadAt(thread_id, input.user_id);
	if (lastRead === undefined) return;
	const streak = lastRead?.toISOString() ?? 'never';
	await ctx.jobs.send(
		'notify.send',
		{
			user_id: input.user_id,
			type: input.type,
			payload: { template: input.payload.template, thread_id },
			dedupe_key: `${FOLLOW_UP}${thread_id}`,
		},
		{ id: uuidFrom(`chat-email:${input.user_id}:${thread_id}:${streak}`), startAfter: CHAT_EMAIL_DELAY_S }
	);
}

async function sendNotificationEmail(
	user_id: string,
	to: string,
	type: NotificationType,
	vars: Vars,
	locale: Locale,
	ctx: Ctx
) {
	const spec = TYPES[type];
	const unsubscribe_url = spec.category === 'alert' ? unsubscribeUrl(user_id, type) : undefined;
	const message = renderEmail(type, vars, locale, ctx.now, {
		url: webUrl(spec.link(vars), locale),
		unsubscribe_url,
		support_email: supportEmail(),
	});
	await sendAndRecord(
		{
			to,
			user_id,
			type,
			locale,
			...message,
			...(unsubscribe_url && {
				headers: {
					'List-Unsubscribe': `<${unsubscribe_url}>`,
					'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
				},
			}),
		},
		ctx
	);
}

type EmailStatus = 'sent' | 'failed' | 'mocked';

/** Sends through the email adapter and records the attempt in email_outbox (address hashed only); returns its status. */
async function sendAndRecord(
	message: {
		to: string;
		user_id: string | null;
		type: NotificationType;
		locale: Locale;
		subject: string;
		html: string;
		text: string;
		headers?: Record<string, string>;
	},
	ctx: Ctx
): Promise<EmailStatus> {
	const { user_id, type, locale, ...email } = message;
	const outcome: { status: EmailStatus; provider_id?: string; error?: string } = {
		status: 'failed',
	};
	try {
		outcome.provider_id = (await ctx.adapters.email.send(email)).id;
		outcome.status = ctx.adapters.email.sent ? 'mocked' : 'sent';
	} catch (err) {
		outcome.error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
		ctx.logger.warn({ err, type }, 'notify.send: email failed');
	}
	await NotificationsDao.insertOutbox({
		user_id,
		template: type,
		locale,
		to_address_hash: emailHash(email.to),
		...outcome,
	});
	return outcome.status;
}

/**
 * manage_link (C10): email only, to the finder's report_contacts address, transactional (no prefs, no quiet hours).
 * Sent directly, not through notify.send: the URL carries the secret manage token, which is never stored (pgboss.job
 * included). The caller passes only an address the finder confirmed (FR-010). Locale: the request's (ctx.locale).
 * Returns the recorded status ('failed' when the provider refused or timed out).
 */
export async function sendManageLink(
	input: {
		to: string;
		report_code: string;
		report_type: 'found' | 'sighted';
		species: Species;
		manage_token: string;
	},
	ctx: Ctx
): Promise<EmailStatus> {
	const { to, manage_token, ...vars } = input;
	const locale = ctx.locale;
	const url = `${webUrl('/m', locale)}#${manage_token}`;
	const message = renderEmail('manage_link', vars, locale, ctx.now, { url, support_email: supportEmail() });
	return sendAndRecord({ to, user_id: null, type: 'manage_link', locale, ...message }, ctx);
}

// --- Signed one-click unsubscribe ---

const unsubscribeSignature = (user_id: string, type: string) => hashKey(`unsubscribe:${user_id}:${type}`);

export function unsubscribeToken(user_id: string, type: NotificationType): string {
	return `${user_id}.${type}.${unsubscribeSignature(user_id, type)}`;
}

function unsubscribeUrl(user_id: string, type: NotificationType): string {
	const token = encodeURIComponent(unsubscribeToken(user_id, type));
	return `${config.API_URL.replace(/\/+$/, '')}/v1/notifications/unsubscribe?token=${token}`;
}

/** Verifies the signed token (no write); returns the user, type and profile locale. */
export async function unsubscribePage(input: { token: string }, _ctx: Ctx) {
	const [user_id = '', type = '', signature = '', ...rest] = input.token.split('.');
	const expected = Buffer.from(unsubscribeSignature(user_id, type));
	const valid =
		!rest.length &&
		Uuid.safeParse(user_id).success &&
		(NOTIFICATION_TYPES as readonly string[]).includes(type) &&
		TYPES[type as NotificationType].prefs &&
		expected.length === Buffer.byteLength(signature) &&
		timingSafeEqual(expected, Buffer.from(signature));
	if (!valid) throw new AppError('VALIDATION', 'Invalid unsubscribe link');
	const recipient = await NotificationsDao.getRecipient(user_id);
	if (!recipient) throw new AppError('NOT_FOUND', 'Account not found');
	return { user_id, type: type as NotificationType, locale: localeOf(recipient) };
}

/** POST (the confirm form or an RFC 8058 one-click): turns the email channel of the token's type off. */
export async function unsubscribe(input: { token: string }, ctx: Ctx): Promise<{ locale: Locale }> {
	const { user_id, type, locale } = await unsubscribePage(input, ctx);
	await NotificationsDao.upsertPref({ user_id, type, defaults: defaults(type), changes: { email: false } });
	return { locale };
}

// --- Inbox, prefs, push tokens (/v1, the signed-in actor) ---

const PAGE = 20;
const CONFIGURABLE = NOTIFICATION_TYPES.filter((type) => TYPES[type].prefs);
const defaults = (type: NotificationType) => ({ in_app: true, push: true, email: TYPES[type].email_default ?? true });

function actorId(ctx: Ctx): string {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED');
	return ctx.actor.user_id;
}

export async function listNotifications(input: { cursor?: string; limit?: number }, ctx: Ctx) {
	const user_id = actorId(ctx);
	const limit = input.limit ?? PAGE;
	const rows = await NotificationsDao.listNotifications({ user_id, cursor: input.cursor, take: limit + 1 });
	const items = rows.slice(0, limit);
	return {
		items,
		next_cursor: rows.length > limit ? items[items.length - 1]!.id : null,
		unread: await NotificationsDao.countUnread(user_id),
	};
}

export async function markRead(input: { ids: string[] } | { all: true }, ctx: Ctx): Promise<void> {
	await NotificationsDao.markRead({
		user_id: actorId(ctx),
		ids: 'ids' in input ? input.ids : undefined,
		now: ctx.now,
	});
}

/** Every type the user can switch (not the transactional manage_link and payment_receipt), plus quiet hours. */
export async function getPrefs(_input: unknown, ctx: Ctx) {
	const user_id = actorId(ctx);
	const [rows, quiet] = await Promise.all([
		NotificationsDao.listPrefs(user_id),
		NotificationsDao.getQuietHours(user_id),
	]);
	const stored = new Map(rows.map((row) => [row.type, row]));
	return {
		items: CONFIGURABLE.map((type) => ({ ...defaults(type), ...stored.get(type), type })),
		quiet_from: quiet?.quiet_from ?? null,
		quiet_to: quiet?.quiet_to ?? null,
	};
}

export async function setPref(
	input: { type: NotificationType; in_app?: boolean; push?: boolean; email?: boolean },
	ctx: Ctx
) {
	const user_id = actorId(ctx);
	const { type, ...changes } = input;
	if (!TYPES[type].prefs) {
		throw new AppError('VALIDATION', 'This notification type cannot be switched off', undefined, [
			{ path: 'type', message: 'Transactional notification' },
		]);
	}
	return NotificationsDao.upsertPref({ user_id, type, defaults: defaults(type), changes });
}

export async function registerPushToken(input: { token: string; platform: 'ios' | 'android' }, ctx: Ctx) {
	await NotificationsDao.upsertPushToken({ user_id: actorId(ctx), ...input, now: ctx.now });
}

/** Removes the caller's own token only; someone else's token, or an unknown one, is a no-op. */
export async function unregisterPushToken(input: { token: string }, ctx: Ctx) {
	await NotificationsDao.deletePushTokens({ tokens: [input.token], user_id: actorId(ctx) });
}

export default {
	enqueueNotification,
	deliver,
	sendManageLink,
	unsubscribe,
	unsubscribePage,
	unsubscribeToken,
	listNotifications,
	markRead,
	getPrefs,
	setPref,
	registerPushToken,
	unregisterPushToken,
};
