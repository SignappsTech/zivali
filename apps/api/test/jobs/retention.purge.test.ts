// retention.purge (TASK-114.33) with a faked clock (ctx.now): for every time window a row just inside it stays and
// one just outside goes; a dry_run that is not a boolean and a dry run change nothing; a re-run purges nothing new;
// reports go last, only once no conversation refers to them, and take their matches and alert deliveries along; the
// log holds counts only. Photos (24 h, 12 months) and ai_results are covered by the photos and AI domain tests.
import { randomInt, randomUUID } from 'node:crypto';

import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReportsDomain } from '../../domains/reports/index.ts';
import { handlers, type JobCtx } from '../../jobs/index.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { PURGE_BATCH } from '../../lib/purge.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const NOW = new Date();
const SEC = 1000;
const HOUR = 3600 * SEC;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const monthsAgo = (months: number) => {
	const at = new Date(NOW);
	at.setUTCMonth(at.getUTCMonth() - months);
	return at;
};
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
const reportMonths = (months: number) => {
	const get = configStore.get;
	vi.spyOn(configStore, 'get').mockImplementation(async (key) =>
		key === 'retention.report_months' ? months : get(key)
	);
};

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

	// Open flags stay however old; resolved ones 12 months after resolution.
	const flag = (resolved_at: Date | null) =>
		prisma.moderation_flags.create({
			data: {
				kind: 'anon_hold',
				target_type: 'report',
				target_id: randomUUID(),
				created_at: ago(5 * 365 * DAY),
				resolved_at,
			},
		});
	const flags = await byId([flag(inside(monthsAgo(12))), flag(null), flag(outside(monthsAgo(12)))]);
	seeded.moderation_flags = {
		kept: flags.slice(0, 2),
		gone: [flags[2]!],
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

beforeAll(async () => {
	userId = await createAuthUser();
	await prisma.profiles.create({ data: { id: userId } });
	actor = { user_id: userId, role: 'USER', is_anonymous: false, aal: 'aal1', email_verified: true, locale: 'sl' };
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
	await prisma.moderation_flags.deleteMany({ where: { id: { in: seeded.moderation_flags?.kept ?? [] } } });
	await prisma.ai_calls.deleteMany({ where: { id: { in: seeded.ai_calls?.kept ?? [] } } });
	await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
	await deleteAuthUsers([userId]);
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

	it('keeps each row just inside its window and purges the one just outside; a re-run purges nothing', async () => {
		const { line } = await run(null);
		expect(line.dry_run).toBe(false);
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
