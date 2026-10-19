// retention.purge (TASK-114.33) with a fixed clock (ctx.now, 31 August, so a 6-month window ends on 28 February): for
// every time window a row just inside it stays and one just outside goes; a dry_run that is not a boolean, a dry run
// (a purgeable photo included: no storage delete is queued) and, while retention.purge_live is not true, the classes
// this task added change nothing; a re-run purges nothing new; reports go last, only once no conversation refers to
// them, and take their matches and alert deliveries along; the log holds counts only. Anonymous accounts (TASK-28.8)
// go 30 days idle with their Auth user and photos, never while a report of theirs is open or recently ended, a chat
// of theirs is left or an abuse report of theirs is open; a failed Auth delete holds up no other account; anonymous
// Auth users without a profile go too; the Auth admin API is mocked (UsersDomain.deleteAuthUser deletes the scratch auth.users row) and
// never called by a dry or not-live run. Photo windows (24 h, 12 months) and ai_results are covered by the photos and
// AI domain tests.
import { randomInt, randomUUID } from 'node:crypto';

import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { ReportsDomain } from '../../domains/reports/index.ts';
import { UsersDomain } from '../../domains/users/index.ts';
import { handlers, type JobCtx } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { config as env } from '../../lib/config.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { monthsAgo as libMonthsAgo, PURGE_BATCH } from '../../lib/purge.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const NOW = new Date('2026-08-31T10:00:00.000Z');
const SEC = 1000;
const HOUR = 3600 * SEC;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
/** The month windows back from NOW, written out: 31 Aug minus 6 months is 28 Feb (clamped), not 3 Mar. */
const MONTHS_AGO = {
	6: new Date('2026-02-28T10:00:00.000Z'),
	12: new Date('2025-08-31T10:00:00.000Z'),
	24: new Date('2024-08-31T10:00:00.000Z'),
};
const monthsAgo = (months: keyof typeof MONTHS_AGO) => MONTHS_AGO[months];
/** One second on either side of a window's cutoff. */
const inside = (cutoff: Date) => new Date(cutoff.getTime() + SEC);
const outside = (cutoff: Date) => new Date(cutoff.getTime() - SEC);

const LJ = { lat: 46.0514 + randomInt(0, 900) / 10_000, lng: 14.5061 };
const EVENT_AT = new Date(Date.UTC(1800, 0, 1) + randomInt(0, 900) * 70 * DAY);
const RATE_NAME = `test.retention.${randomUUID()}`;
const LEAD_EMAIL = `${randomUUID()}@lead.invalid`;
const reportIds: string[] = [];
let userId: string, actor: Actor;

async function report(type: 'lost' | 'found', data: object = {}): Promise<string> {
	const { id } = await ReportsDomain.insertReport(
		{ type, species: 'cat', location: LJ, event_at: EVENT_AT },
		userCtx(actor)
	);
	reportIds.push(id);
	await prisma.reports.update({ where: { id }, data });
	return id;
}

const conversation = (about_report_id: string, closed_at: Date, other_report_id?: string) =>
	prisma.conversations.create({
		data: { about_report_id, lost_report_id: about_report_id, other_report_id, status: 'read_only', closed_at },
		select: { id: true },
	});
const match = (lost_report_id: string, other_report_id: string) =>
	prisma.matches.create({
		data: { lost_report_id, other_report_id, score: 0.8, strength: 'good', chip_match: false, reasons: {} },
		select: { id: true },
	});
const delivery = (report_id: string) =>
	prisma.alert_deliveries.create({ data: { report_id, user_id: userId, channel: 'push' } });

function run(data: unknown) {
	const lines: string[] = [];
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	const ctx: JobCtx = { ...systemCtx({ logger, now: NOW }), prisma, send: jobs.send };
	return handlers['retention.purge'](data, ctx).then(() => {
		const line = lines
			.map((l) => JSON.parse(l) as Record<string, unknown>)
			.find((l) => l.msg === 'retention purge done');
		return { line: line!, raw: lines.join('\n') };
	});
}
/** app_config keys a test sets; any other key (or a deleted one) reads the database. Live by default. */
let config: Record<string, unknown> = {};
const reportMonths = (months: number) => void (config['retention.report_months'] = months);
/** The value from the migration (false): the classes this task added only count. */
const notLive = () => void delete config['retention.purge_live'];
/** The classes TASK-114.33 added, gated by retention.purge_live; the rest purged before it and stay live. */
const ADDED = ['email_outbox', 'partner_stats_snapshot', 'leads', 'abuse_reports', 'moderation_flags'];

/** Each window's rows, `kept` just inside and `gone` just outside, and how to read back which are left. */
type Seeded = { kept: string[]; gone: string[]; left: () => Promise<string[]> };
const seeded: Record<string, Seeded> = {};

async function seedWindows() {
	const rate = (key: string, window_start: Date) => ({ name: RATE_NAME, key, window_start });
	await prisma.rate_limits.createMany({
		data: [rate('kept', inside(ago(48 * HOUR))), rate('gone', outside(ago(48 * HOUR)))],
	});
	seeded.rate_limits = {
		kept: ['kept'],
		gone: ['gone'],
		left: async () =>
			(await prisma.rate_limits.findMany({ where: { name: RATE_NAME, key: { in: ['kept', 'gone'] } } })).map(
				(r) => r.key
			),
	};

	const keys = [randomUUID(), randomUUID()];
	await prisma.idempotency_keys.createMany({
		data: [inside(ago(24 * HOUR)), outside(ago(24 * HOUR))].map((created_at, i) => ({
			key: keys[i]!,
			user_id: userId,
			route: 'POST /v1/test',
			created_at,
		})),
	});
	seeded.idempotency_keys = {
		kept: [keys[0]!],
		gone: [keys[1]!],
		left: async () => (await prisma.idempotency_keys.findMany({ where: { key: { in: keys } } })).map((r) => r.key),
	};

	const byId = async <T extends { id: string }>(rows: Promise<T>[]) => (await Promise.all(rows)).map((r) => r.id);
	const outbox = await byId(
		[inside(ago(30 * DAY)), outside(ago(30 * DAY))].map((created_at) =>
			prisma.email_outbox.create({
				data: { template: 'test', locale: 'sl', to_address_hash: 'h', status: 'sent', created_at },
			})
		)
	);
	seeded.email_outbox = {
		kept: [outbox[0]!],
		gone: [outbox[1]!],
		left: async () => (await prisma.email_outbox.findMany({ where: { id: { in: outbox } } })).map((r) => r.id),
	};

	const stats = await byId(
		[inside(ago(90 * DAY)), outside(ago(90 * DAY))].map((generated_at) =>
			prisma.partner_stats_snapshot.create({ data: { generated_at, data: {} } })
		)
	);
	seeded.partner_stats_snapshot = {
		kept: [stats[0]!],
		gone: [stats[1]!],
		left: async () =>
			(await prisma.partner_stats_snapshot.findMany({ where: { id: { in: stats } } })).map((r) => r.id),
	};

	const leads = await byId(
		[inside(monthsAgo(24)), outside(monthsAgo(24))].map((created_at) =>
			prisma.leads.create({
				data: {
					company: 'Test d.o.o.',
					contact_name: 'Test',
					email: LEAD_EMAIL,
					message: 'm',
					consent_at: created_at,
					created_at,
				},
			})
		)
	);
	seeded.leads = {
		kept: [leads[0]!],
		gone: [leads[1]!],
		left: async () => (await prisma.leads.findMany({ where: { id: { in: leads } } })).map((r) => r.id),
	};

	// Abuse reports, open or not, go 24 months after creation (privacy policy §14).
	const abuse = await byId(
		[inside(monthsAgo(24)), outside(monthsAgo(24))].map((created_at) =>
			prisma.abuse_reports.create({
				data: {
					reporter_id: userId,
					target_type: 'report',
					target_id: randomUUID(),
					reason: 'SPAM',
					created_at,
				},
			})
		)
	);
	seeded.abuse_reports = {
		kept: [abuse[0]!],
		gone: [abuse[1]!],
		left: async () => (await prisma.abuse_reports.findMany({ where: { id: { in: abuse } } })).map((r) => r.id),
	};

	// Open flags of an existing report stay however old; resolved ones 12 months after resolution; the flags of a
	// report that is gone go, open ones too.
	const target = await report('found');
	const flag = (resolved_at: Date | null, target_id = target) =>
		prisma.moderation_flags.create({
			data: { kind: 'anon_hold', target_type: 'report', target_id, created_at: ago(5 * 365 * DAY), resolved_at },
		});
	const flags = await byId([
		flag(inside(monthsAgo(12))),
		flag(null),
		flag(outside(monthsAgo(12))),
		flag(null, randomUUID()),
	]);
	seeded.moderation_flags = {
		kept: flags.slice(0, 2),
		gone: flags.slice(2),
		left: async () => (await prisma.moderation_flags.findMany({ where: { id: { in: flags } } })).map((r) => r.id),
	};

	const calls = await byId(
		[inside(ago(62 * DAY)), outside(ago(62 * DAY))].map((created_at) =>
			prisma.ai_calls.create({
				data: {
					provider: 'mock',
					model: `test-${randomUUID()}`,
					outcome: 'ok',
					input_tokens: 0,
					output_tokens: 0,
					cost_usd: 0,
					latency_ms: 1,
					created_at,
				},
			})
		)
	);
	seeded.ai_calls = {
		kept: [calls[0]!],
		gone: [calls[1]!],
		left: async () => (await prisma.ai_calls.findMany({ where: { id: { in: calls } } })).map((r) => r.id),
	};

	// The device hash of an anonymous report is cleared after 7 days; the report stays.
	const hashed = [
		await report('found', { device_hash: 'h', created_at: inside(ago(7 * DAY)) }),
		await report('found', { device_hash: 'h', created_at: outside(ago(7 * DAY)) }),
	];
	seeded.device_hashes = {
		kept: [hashed[0]!],
		gone: [hashed[1]!],
		left: async () =>
			(await prisma.reports.findMany({ where: { id: { in: hashed }, device_hash: 'h' } })).map((r) => r.id),
	};

	// Read-only chats of an open report: retention.chat_months (6) after closing.
	const open = await report('lost');
	const chats = await byId([conversation(open, inside(monthsAgo(6))), conversation(open, outside(monthsAgo(6)))]);
	seeded.conversations = {
		kept: [chats[0]!],
		gone: [chats[1]!],
		left: async () => (await prisma.conversations.findMany({ where: { id: { in: chats } } })).map((r) => r.id),
	};
}

const left = async () =>
	Object.fromEntries(
		await Promise.all(Object.entries(seeded).map(async ([name, s]) => [name, (await s.left()).sort()]))
	);
const all = () => Object.fromEntries(Object.entries(seeded).map(([name, s]) => [name, [...s.kept, ...s.gone].sort()]));
const keptOnly = () => Object.fromEntries(Object.entries(seeded).map(([name, s]) => [name, [...s.kept].sort()]));
/** Purged by the established steps only: the added classes keep every row. */
const keptUnlessAdded = () =>
	Object.fromEntries(
		Object.entries(seeded).map(([name, s]) => [name, [...s.kept, ...(ADDED.includes(name) ? s.gone : [])].sort()])
	);

beforeAll(async () => {
	userId = await createAuthUser();
	await prisma.profiles.create({ data: { id: userId } });
	actor = { user_id: userId, role: 'USER', is_anonymous: false, aal: 'aal1', email_verified: true, locale: 'sl' };
});

/** The Supabase Auth admin API, mocked: deletes the scratch auth.users row (an absent one is fine, as a 404 is). */
let authDeletes: MockInstance<typeof UsersDomain.deleteAuthUser>;

beforeEach(() => {
	authDeletes = vi.spyOn(UsersDomain, 'deleteAuthUser').mockImplementation(async (id) => {
		await prisma.$executeRaw`delete from auth.users where id = ${id}::uuid`;
	});
	config = { 'retention.purge_live': true };
	const get = configStore.get;
	vi.spyOn(configStore, 'get').mockImplementation(async (key) => (key in config ? config[key] : get(key)));
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
	await prisma.rate_limits.deleteMany({ where: { name: RATE_NAME } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: userId } });
	await prisma.email_outbox.deleteMany({ where: { id: { in: seeded.email_outbox?.kept ?? [] } } });
	await prisma.partner_stats_snapshot.deleteMany({
		where: { id: { in: seeded.partner_stats_snapshot?.kept ?? [] } },
	});
	await prisma.leads.deleteMany({ where: { email: LEAD_EMAIL } });
	await prisma.abuse_reports.deleteMany({ where: { reporter_id: userId } });
	await prisma.moderation_flags.deleteMany({ where: { id: { in: seeded.moderation_flags?.kept ?? [] } } });
	await prisma.ai_calls.deleteMany({ where: { id: { in: seeded.ai_calls?.kept ?? [] } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await deleteAuthUsers([userId]);
});

describe('monthsAgo', () => {
	it('clamps the day to the end of a shorter month, so a window never ends early', () => {
		const at = (iso: string, months: number) => libMonthsAgo(new Date(iso), months).toISOString();
		expect(at('2026-08-31T10:00:00.000Z', 6)).toBe('2026-02-28T10:00:00.000Z');
		expect(at('2028-02-29T00:00:00.000Z', 12)).toBe('2027-02-28T00:00:00.000Z');
		expect(at('2026-03-31T23:59:59.000Z', 1)).toBe('2026-02-28T23:59:59.000Z');
		expect(at('2026-08-15T10:00:00.000Z', 6)).toBe('2026-02-15T10:00:00.000Z');
		expect(at('2026-01-31T10:00:00.000Z', 24)).toBe('2024-01-31T10:00:00.000Z');
	});
});

describe('retention.purge windows', () => {
	it('refuses a dry_run that is not a boolean without touching anything', async () => {
		await seedWindows();
		await expect(run({ dry_run: 'yes' })).rejects.toThrow();
		await expect(run({ dry_run: 'true' })).rejects.toThrow();
		expect(await left()).toEqual(all());
	});

	it('dry run: counts what would go, changes nothing', async () => {
		const { line } = await run({ dry_run: true });
		expect(line.dry_run).toBe(true);
		const purged = line.purged as Record<string, number | null>;
		for (const name of Object.keys(seeded)) expect(purged[name]).toBeGreaterThanOrEqual(1);
		expect(await left()).toEqual(all());
	});

	it('while retention.purge_live is not true, only counts the classes this task added', async () => {
		notLive();
		const { line } = await run({});
		expect(line).toMatchObject({ dry_run: false, purge_live: false });
		const purged = line.purged as Record<string, number | null>;
		for (const name of ADDED) expect(purged[name]).toBeGreaterThanOrEqual(1);
		expect(await left()).toEqual(keptUnlessAdded());
	});

	it('keeps each row just inside its window and purges the one just outside; a re-run purges nothing', async () => {
		const { line } = await run(null);
		expect(line).toMatchObject({ dry_run: false, purge_live: true });
		expect(await left()).toEqual(keptOnly());
		for (const id of seeded.device_hashes!.gone) expect(await prisma.reports.count({ where: { id } })).toBe(1);

		const again = await run({});
		expect(Object.values(again.line.purged as object).every((n) => n === 0 || n === null)).toBe(true);
		expect(await left()).toEqual(keptOnly());
	});

	it('deletes in batches until nothing is left past the window', async () => {
		const rows = 2 * PURGE_BATCH + 1;
		await prisma.rate_limits.createMany({
			data: Array.from({ length: rows }, (_, i) => ({
				name: RATE_NAME,
				key: `bulk-${i}`,
				window_start: ago(49 * HOUR),
			})),
		});
		const { line } = await run({});
		expect((line.purged as { rate_limits: number }).rate_limits).toBeGreaterThanOrEqual(rows);
		expect(await prisma.rate_limits.count({ where: { name: RATE_NAME, key: { startsWith: 'bulk-' } } })).toBe(0);
	});

	it('logs counts only', async () => {
		const { line, raw } = await run({ dry_run: true });
		for (const n of Object.values(line.purged as object)) expect(n === null || Number.isInteger(n)).toBe(true);
		expect(raw).not.toContain(LEAD_EMAIL);
		expect(raw).not.toContain(userId);
	});

	it('dry run with a purgeable photo: the photo stays and no storage delete is queued', async () => {
		const photo = await prisma.photos.create({
			data: { owner_id: userId, sha256: randomUUID(), width: 1, height: 1, bytes: 1, updated_at: ago(25 * HOUR) },
		});
		const queued = async () =>
			(
				await prisma.$queryRaw<{ n: number }[]>`
					select count(*)::int as n from pgboss.job
					where name = 'retention.purge' and data::text like ${`%${photo.id}%`}`
			)[0]!.n;

		const dry = await run({ dry_run: true });
		expect((dry.line.purged as { photos: number }).photos).toBeGreaterThanOrEqual(1);
		expect(await prisma.photos.count({ where: { id: photo.id } })).toBe(1);
		expect(await queued()).toBe(0);

		// The live run does both; the queued object delete is removed again (no worker runs in this test).
		await run({});
		expect(await prisma.photos.count({ where: { id: photo.id } })).toBe(0);
		expect(await queued()).toBe(1);
		await prisma.$executeRaw`
			delete from pgboss.job where name = 'retention.purge' and data::text like ${`%${photo.id}%`}`;
	});
});

describe('retention.purge reports (last)', () => {
	it('keeps every report while retention.report_months is not set', async () => {
		const old = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: ago(20 * 365 * DAY) });
		const { line } = await run({});
		expect((line.purged as { reports: number | null }).reports).toBeNull();
		expect(await prisma.reports.count({ where: { id: old } })).toBe(1);
	});

	it('deletes reports ended past the window once no conversation is left, with their matches and alerts', async () => {
		reportMonths(12);
		const cutoff = monthsAgo(12);
		const partner = await report('found');
		// Past the window; its chat is past the chat window too, so the chat goes first and then the report.
		const gone = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: outside(cutoff) });
		const goneMatch = await match(gone, partner);
		const goneChat = await conversation(gone, outside(monthsAgo(6)), partner);
		await delivery(gone);
		const reunited = await report('lost', { status: 'reunited', reunited_at: outside(cutoff) });
		// Just inside the window: stays with everything that hangs on it.
		const recent = await report('lost', { status: 'closed', close_reason: 'gave_up', closed_at: inside(cutoff) });
		const recentMatch = await match(recent, partner);
		await delivery(recent);
		// Past the window, but its chat is still readable: the report waits for the chat.
		const chatting = await report('lost', {
			status: 'closed',
			close_reason: 'gave_up',
			closed_at: outside(cutoff),
		});
		const chattingChat = await conversation(chatting, inside(monthsAgo(6)));
		// Open reports stay however old.
		const open = await report('lost', { created_at: ago(5 * 365 * DAY), last_owner_update_at: ago(5 * 365 * DAY) });
		// A found report past the window stays while a readable chat names it as the other side.
		const other = await report('found', {
			status: 'closed',
			close_reason: 'returned_to_owner',
			closed_at: outside(cutoff),
		});
		await conversation(open, inside(monthsAgo(6)), other);

		const dry = await run({ dry_run: true });
		expect((dry.line.purged as { reports: number }).reports).toBeGreaterThanOrEqual(2);
		expect(await prisma.reports.count({ where: { id: { in: [gone, reunited] } } })).toBe(2);

		// Not live yet: the chat past its window goes (an established step), the reports are only counted.
		notLive();
		const counted = await run({});
		expect(counted.line.purge_live).toBe(false);
		expect((counted.line.purged as { reports: number }).reports).toBeGreaterThanOrEqual(2);
		expect(await prisma.reports.count({ where: { id: { in: [gone, reunited] } } })).toBe(2);
		config['retention.purge_live'] = true;

		const { line } = await run({});
		expect((line.purged as { reports: number }).reports).toBeGreaterThanOrEqual(2);
		const reports = await prisma.reports.findMany({
			where: { id: { in: [gone, reunited, recent, chatting, open, partner, other] } },
		});
		expect(reports.map((r) => r.id).sort()).toEqual([recent, chatting, open, partner, other].sort());
		const matches = await prisma.matches.findMany({ where: { id: { in: [goneMatch.id, recentMatch.id] } } });
		expect(matches.map((m) => m.id)).toEqual([recentMatch.id]);
		expect(await prisma.conversations.count({ where: { id: goneChat.id } })).toBe(0);
		expect(await prisma.conversations.count({ where: { id: chattingChat.id } })).toBe(1);
		const deliveries = await prisma.alert_deliveries.findMany({ where: { report_id: { in: [gone, recent] } } });
		expect(deliveries.map((d) => d.report_id)).toEqual([recent]);

		// Idempotent: nothing more goes on a second run.
		expect((await run({})).line.purged).toMatchObject({ reports: 0 });

		// Once the chat is past its window too, it goes and the report follows in the same run.
		await prisma.conversations.update({
			where: { id: chattingChat.id },
			data: { closed_at: outside(monthsAgo(6)) },
		});
		const last = await run({});
		expect(last.line.purged).toMatchObject({ conversations: 1, reports: 1 });
		expect(await prisma.reports.count({ where: { id: chatting } })).toBe(0);
	});
});

describe('retention.purge anonymous accounts (last)', () => {
	const cutoff = ago(30 * DAY);
	const accounts: string[] = [];
	/** A profile with a real auth.users row: anonymous in both unless `converted` (Auth says full account) or `full`. */
	async function account(created_at: Date, { converted = false, full = false } = {}): Promise<string> {
		const id = await createAuthUser({ is_anonymous: !converted && !full });
		await prisma.profiles.create({ data: { id, is_anonymous: !full, created_at } });
		accounts.push(id);
		return id;
	}
	/** An auth.users row that never got a profile (profiles are created on the first authenticated request). */
	async function authOnly(created_at: Date, { full = false } = {}): Promise<string> {
		const id = await createAuthUser({ is_anonymous: !full });
		await prisma.$executeRaw`update auth.users set created_at = ${created_at} where id = ${id}::uuid`;
		accounts.push(id);
		return id;
	}
	const ended = (closed_at: Date) => ({ status: 'closed', close_reason: 'returned_to_owner', closed_at });
	const abuse = (reporter_id: string, status: 'open' | 'dismissed') =>
		prisma.abuse_reports.create({
			data: { reporter_id, target_type: 'report', target_id: randomUUID(), reason: 'SPAM', status },
		});
	const profilesLeft = async (ids: string[]) =>
		(await prisma.profiles.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((r) => r.id).sort();
	const authLeft = async (ids: string[]) =>
		(await prisma.$queryRaw<{ id: string }[]>`select id::text as id from auth.users where id = any(${ids}::uuid[])`)
			.map((r) => r.id)
			.sort();
	const queued = async (photoId: string) =>
		(
			await prisma.$queryRaw<{ n: number }[]>`
				select count(*)::int as n from pgboss.job
				where name = 'retention.purge' and data::text like ${`%${photoId}%`}`
		)[0]!.n;
	type Counts = { anonymous_accounts: number; anonymous_auth_users: number; auth_delete_failures: number };
	const counts = (line: Record<string, unknown>) => line.purged as Counts;

	let gone: Record<'idle' | 'ended' | 'reported', string>;
	let kept: Record<'fresh' | 'open' | 'manager' | 'recent' | 'chatting' | 'reporting' | 'converted' | 'full', string>;
	let noProfile: Record<'old' | 'fresh' | 'full', string>;
	let endedReport: string, photo: string;
	const everyone = () => [...Object.values(gone), ...Object.values(kept)].sort();
	const authOnlyIds = () => Object.values(noProfile).sort();

	beforeAll(async () => {
		const old = outside(cutoff);
		gone = { idle: await account(old), ended: await account(old), reported: await account(old) };
		kept = {
			fresh: await account(inside(cutoff)),
			open: await account(old),
			manager: await account(old),
			recent: await account(old),
			chatting: await account(old),
			reporting: await account(old),
			converted: await account(old, { converted: true }),
			full: await account(old, { full: true }),
		};
		noProfile = {
			old: await authOnly(old),
			fresh: await authOnly(inside(cutoff)),
			full: await authOnly(old, { full: true }),
		};
		// Ended past the window: the report stays without its creator; its photo goes with a storage delete queued.
		endedReport = await report('found', { created_by: gone.ended, ...ended(outside(cutoff)) });
		photo = (
			await prisma.photos.create({
				data: {
					owner_id: gone.ended,
					report_id: endedReport,
					sha256: randomUUID(),
					width: 1,
					height: 1,
					bytes: 1,
				},
			})
		).id;
		// Open: made by the account, or managed through the private link (claimed, C7), however old.
		await report('found', { created_by: kept.open });
		const managed = await report('found');
		await prisma.report_managers.create({ data: { report_id: managed, user_id: kept.manager, role: 'finder' } });
		await report('found', { created_by: kept.recent, ...ended(inside(cutoff)) });
		// Ended past the window, but its read-only chat is still there (C9): the account waits for the chat purge.
		const talked = await report('found', { created_by: kept.chatting, ...ended(outside(cutoff)) });
		const chat = await conversation(talked, inside(monthsAgo(6)));
		await prisma.conversation_participants.create({
			data: { conversation_id: chat.id, user_id: kept.chatting, role: 'finder' },
		});
		// An open abuse report keeps its reporter for moderation; a closed one goes with the account.
		await abuse(kept.reporting, 'open');
		await abuse(gone.reported, 'dismissed');
	});

	afterAll(async () => {
		await prisma.$executeRaw`delete from pgboss.job where name = 'retention.purge' and data::text like ${`%${photo}%`}`;
		await prisma.photos.deleteMany({ where: { owner_id: { in: accounts } } });
		await deleteAuthUsers(accounts);
	});

	it('dry run and not live: counts the idle accounts, changes nothing and never calls the Auth admin API', async () => {
		const dry = counts((await run({ dry_run: true })).line);
		expect(dry.anonymous_accounts).toBeGreaterThanOrEqual(3);
		expect(dry.anonymous_auth_users).toBeGreaterThanOrEqual(1);

		notLive();
		const counted = await run({});
		expect(counted.line.purge_live).toBe(false);
		expect(counts(counted.line).anonymous_accounts).toBeGreaterThanOrEqual(3);
		expect(counts(counted.line).anonymous_auth_users).toBeGreaterThanOrEqual(1);

		expect(authDeletes).not.toHaveBeenCalled();
		expect(await profilesLeft(everyone())).toEqual(everyone());
		expect(await authLeft(everyone())).toEqual(everyone());
		expect(await authLeft(authOnlyIds())).toEqual(authOnlyIds());
		expect(await prisma.photos.count({ where: { id: photo } })).toBe(1);
		expect(await queued(photo)).toBe(0);
	});

	it('live: deletes accounts idle past the window with their Auth user and photos; a re-run deletes nothing', async () => {
		const { line } = await run({});
		expect(counts(line).anonymous_accounts).toBeGreaterThanOrEqual(3);
		expect(counts(line).anonymous_auth_users).toBeGreaterThanOrEqual(1);
		expect(counts(line).auth_delete_failures).toBe(0);
		for (const id of [...Object.values(gone), noProfile.old]) expect(authDeletes).toHaveBeenCalledWith(id);
		for (const id of [...Object.values(kept), noProfile.fresh, noProfile.full])
			expect(authDeletes).not.toHaveBeenCalledWith(id);

		const left = Object.values(kept).sort();
		expect(await profilesLeft(everyone())).toEqual(left);
		expect(await authLeft(everyone())).toEqual(left);
		expect(await authLeft(authOnlyIds())).toEqual([noProfile.fresh, noProfile.full].sort());
		const orphaned = await prisma.reports.findUnique({ where: { id: endedReport }, select: { created_by: true } });
		expect(orphaned).toEqual({ created_by: null });
		expect(await prisma.photos.count({ where: { id: photo } })).toBe(0);
		expect(await queued(photo)).toBe(1);
		expect(await prisma.abuse_reports.count({ where: { reporter_id: gone.reported } })).toBe(0);
		expect(await prisma.abuse_reports.count({ where: { reporter_id: kept.reporting } })).toBe(1);

		authDeletes.mockClear();
		expect(counts((await run({})).line)).toMatchObject({ anonymous_accounts: 0, anonymous_auth_users: 0 });
		expect(authDeletes).not.toHaveBeenCalled();
		expect(await profilesLeft(everyone())).toEqual(left);
	});

	it('a failed Auth delete keeps that account and fails the job after the others, past one batch, are gone', async () => {
		// More than one batch of 50; the failing one is the oldest, so it is in the first.
		const failing = await account(outside(ago(31 * DAY)));
		const others: string[] = [];
		for (let i = 0; i < 50; i++) others.push(await account(outside(cutoff)));
		const mocked = authDeletes.getMockImplementation()!;
		authDeletes.mockImplementation(async (id) => {
			if (id === failing) throw new Error('auth user delete failed: HTTP 500');
			return mocked(id);
		});
		await expect(run({})).rejects.toThrow('retention purge: 1 Supabase Auth deletes failed');
		expect(authDeletes).toHaveBeenCalledTimes(51);
		expect(await profilesLeft([failing, ...others])).toEqual([failing]);
		expect(await authLeft([failing, ...others])).toEqual([failing]);

		// The next run, Auth working again, completes it.
		authDeletes.mockImplementation(mocked);
		expect(counts((await run({})).line)).toMatchObject({ anonymous_accounts: 1, auth_delete_failures: 0 });
		expect(await profilesLeft([failing])).toEqual([]);
	});

	it('a crash after the Auth delete: the next run deletes the profile (an Auth user already gone counts as done)', async () => {
		const id = await account(outside(cutoff));
		await prisma.$executeRaw`delete from auth.users where id = ${id}::uuid`;
		expect(counts((await run({})).line).anonymous_accounts).toBe(1);
		expect(authDeletes).toHaveBeenCalledWith(id);
		expect(await profilesLeft([id])).toEqual([]);
	});
});

describe('UsersDomain.deleteAuthUser (Auth admin API, fetch mocked)', () => {
	const id = randomUUID();
	let saved: string | undefined;
	beforeEach(() => {
		authDeletes.mockRestore();
		saved = env.SUPABASE_SECRET_KEY;
		env.SUPABASE_SECRET_KEY = 'test-secret-key';
	});
	afterEach(() => void (env.SUPABASE_SECRET_KEY = saved));

	it('sends DELETE /auth/v1/admin/users/:id with the secret key; a 404 counts as deleted', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
		await UsersDomain.deleteAuthUser(id);
		expect(fetchSpy).toHaveBeenCalledWith(
			`${env.SUPABASE_URL}/auth/v1/admin/users/${id}`,
			expect.objectContaining({
				method: 'DELETE',
				headers: expect.objectContaining({ apikey: 'test-secret-key' }),
			})
		);
		fetchSpy.mockResolvedValue(new Response('{"msg":"User not found"}', { status: 404 }));
		await expect(UsersDomain.deleteAuthUser(id)).resolves.toBeUndefined();
	});

	it('throws on any other status without the key in the message, and without a key never calls out', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
		const err = await UsersDomain.deleteAuthUser(id).catch((e: Error) => e);
		expect((err as Error).message).toBe('auth user delete failed: HTTP 500');

		fetchSpy.mockClear();
		env.SUPABASE_SECRET_KEY = undefined;
		await expect(UsersDomain.deleteAuthUser(id)).rejects.toThrow('SUPABASE_SECRET_KEY is not set');
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
