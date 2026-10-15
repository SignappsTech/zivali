// TASK-38.2: partner stats (C14) — the counts against the real database, masking (1–4 → '<5', 0 stays 0), the
// snapshot the job stores and the API serves, the DB-only GA flag; and the lead flow (captcha, consent time, email,
// no contact data in logs).
import { randomUUID } from 'node:crypto';

import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { PartnersDomain } from '../../domains/partners/index.ts';
import PartnersDao from '../../domains/partners/partners.dao.ts';
import { Prisma } from '../../generated/client.ts';
import { handle as partnersStatsJob } from '../../jobs/partners.stats.job.ts';
import type { JobCtx } from '../../jobs/index.ts';
import { config } from '../../lib/config.ts';
import configStore from '../../lib/config-store.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { loggerOptions } from '../../lib/logger.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const LJUBLJANA = { lat: 46.0512, lng: 14.5051 };
const DAY = 86_400_000;
const users: string[] = [];
const reports: string[] = [];
const leads: string[] = [];
const snapshots: string[] = [];
let region: { id: number; slug: string };

const geography = ({ lat, lng }: typeof LJUBLJANA) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;

async function profile(is_anonymous: boolean, home = true): Promise<void> {
	const id = await createAuthUser({ is_anonymous });
	users.push(id);
	await prisma.profiles.create({ data: { id, is_anonymous } });
	if (home)
		await prisma.$executeRaw`update app.profiles set home_point = ${geography(LJUBLJANA)} where id = ${id}::uuid`;
}

type ReportFields = { type?: string; status?: string; moderation?: string; reunited_days_ago?: number };
async function report({ type = 'lost', status = 'open', moderation = 'visible', reunited_days_ago }: ReportFields) {
	const id = randomUUID();
	reports.push(id);
	const reunited_at = reunited_days_ago === undefined ? null : new Date(Date.now() - reunited_days_ago * DAY);
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, region_id, in_slovenia, reunited_at)
		values (${id}::uuid, ${id.slice(0, 8)}, ${type}::app."REPORT_TYPE", 'dog', ${status}::app."REPORT_STATUS",
			${moderation}::app."MODERATION_STATE", now(), ${geography(LJUBLJANA)}, ${geography(LJUBLJANA)}, 500,
			${region.id}::smallint, true, ${reunited_at})`;
}

// Migration defaults (20261016090000_task_38_2_partners_config); tests change them and put them back.
const DEFAULTS = { 'partners.pilot': true, 'partners.ga_enrichment': false };
async function setConfig(key: keyof typeof DEFAULTS, value: boolean): Promise<void> {
	await prisma.app_config.upsert({ where: { key }, create: { key, value }, update: { value } });
	configStore.invalidate();
}

function capture() {
	const lines: string[] = [];
	const logger = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
	return { lines, ctx: (now = new Date()) => systemCtx({ logger, now }) };
}

beforeAll(async () => {
	if (!(await prisma.regions.count())) await seedGeo();
	region = await prisma.regions.findUniqueOrThrow({ where: { slug: 'osrednjeslovenska' } });
}, 120_000);

afterEach(async () => {
	vi.restoreAllMocks();
	for (const [key, value] of Object.entries(DEFAULTS)) await setConfig(key as keyof typeof DEFAULTS, value);
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { id: { in: reports } } });
	await prisma.leads.deleteMany({ where: { id: { in: leads } } });
	await prisma.partner_stats_snapshot.deleteMany({ where: { id: { in: snapshots } } });
	await deleteAuthUsers(users);
});

describe('maskCount', () => {
	it.each([
		[0, 0],
		[1, '<5'],
		[4, '<5'],
		[5, 5],
		[1234, 1234],
	])('%s → %s', (n, shown) => expect(PartnersDomain.maskCount(n)).toEqual(shown));
});

describe('partner counts (database)', () => {
	it('counts signed-up users by home region, open or matched visible reports and lost reunions of 90 days', async () => {
		const since = new Date(Date.now() - 90 * DAY);
		const regionOf = async () =>
			(await PartnersDao.countByRegion(since)).find((r) => r.region_slug === region.slug)!;
		const [totals, before] = [await PartnersDao.countTotals(since), await regionOf()];

		await profile(false);
		await profile(false, false); // no home point: totals only
		await profile(true); // anonymous finder: never a user
		await report({ status: 'open' });
		await report({ type: 'found', status: 'matched' });
		await report({ status: 'open', moderation: 'hidden' });
		await report({ status: 'closed' });
		await report({ status: 'reunited', reunited_days_ago: 10 });
		await report({ status: 'reunited', reunited_days_ago: 120 });
		await report({ type: 'found', status: 'reunited', reunited_days_ago: 5 });

		const after = await regionOf();
		expect([after.users - before.users, after.active_reports - before.active_reports]).toEqual([1, 2]);
		expect(after.reunions_90d - before.reunions_90d).toBe(1);
		const totalsAfter = await PartnersDao.countTotals(since);
		expect(totalsAfter.users - totals.users).toBe(2);
		expect(totalsAfter.active_reports - totals.active_reports).toBe(2);
		expect(totalsAfter.reunions_90d - totals.reunions_90d).toBe(1);
		expect((await PartnersDao.countByRegion(since)).length).toBe(12);
	});
});

describe('computeStats and getStats', () => {
	const raw = (users: number, active_reports: number, reunions_90d: number) => ({
		users,
		active_reports,
		reunions_90d,
	});

	it('stores a masked snapshot (pilot from app_config) that getStats then serves; snapshots expire after 90 days', async () => {
		vi.spyOn(PartnersDao, 'countTotals').mockResolvedValue(raw(120, 4, 0));
		vi.spyOn(PartnersDao, 'countByRegion').mockResolvedValue([
			{ region_slug: 'gorenjska', ...raw(1, 5, 3) },
			{ region_slug: 'pomurska', ...raw(0, 0, 0) },
		]);
		const old = await prisma.partner_stats_snapshot.create({
			data: { generated_at: new Date(Date.now() - 91 * DAY), data: {} },
		});
		snapshots.push(old.id);
		await setConfig('partners.pilot', false);
		const now = new Date(Date.now() + 60_000);

		const stats = await PartnersDomain.computeStats(undefined, systemCtx({ now }));
		expect(stats).toEqual({
			generated_at: now.toISOString(),
			pilot: false,
			totals: { users: 120, active_reports: '<5', reunions_90d: 0 },
			by_region: [
				{ region_slug: 'gorenjska', users: '<5', active_reports: 5, reunions_90d: '<5' },
				{ region_slug: 'pomurska', users: 0, active_reports: 0, reunions_90d: 0 },
			],
		});
		const stored = await prisma.partner_stats_snapshot.findFirstOrThrow({ where: { generated_at: now } });
		snapshots.push(stored.id);
		expect(stored.data).toEqual(stats);
		expect(await PartnersDomain.getStats(undefined, systemCtx())).toEqual(stats);
		expect(await prisma.partner_stats_snapshot.findUnique({ where: { id: old.id } })).toBeNull();
	});

	it('the hourly job stays DB-only with partners.ga_enrichment on; pilot is true by default', async () => {
		await setConfig('partners.ga_enrichment', true);
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const { lines, ctx } = capture();
		const now = new Date(Date.now() + 120_000);

		await partnersStatsJob(undefined, { ...ctx(now), prisma, send: jobs.send } as JobCtx);

		const stored = await prisma.partner_stats_snapshot.findFirstOrThrow({ where: { generated_at: now } });
		snapshots.push(stored.id);
		const data = stored.data as { pilot: boolean; by_region: unknown[] };
		expect([data.pilot, data.by_region.length]).toEqual([true, 12]);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(lines.join('\n')).toContain('stats stay DB-only');
	});
});

describe('createLead', () => {
	const input = {
		company: 'Ambulanta <Kranj> d.o.o.',
		contact_name: 'Ana Novak',
		email: 'ana.novak@example.si',
		phone: '+38640111222',
		interest: 'vet_partner' as const,
		message: 'Zanima nas partnerstvo.',
		consent: true as const,
		captcha_token: 'ok',
		locale: 'sl' as const,
	};
	const PII = [input.contact_name, input.email, input.phone, input.message];
	const sent = () => adapters.email.sent!;

	beforeAll(() => {
		config.LEADS_NOTIFY_EMAIL = 'leads@test.invalid';
	});
	afterAll(() => {
		config.LEADS_NOTIFY_EMAIL = undefined;
	});

	it('a failed captcha is CAPTCHA_FAILED and stores nothing', async () => {
		const count = await prisma.leads.count();
		await expect(PartnersDomain.createLead({ ...input, captcha_token: 'fail' }, systemCtx())).rejects.toMatchObject(
			{ code: 'CAPTCHA_FAILED' }
		);
		expect(await prisma.leads.count()).toBe(count);
	});

	it('stores the lead with the consent time and emails LEADS_NOTIFY_EMAIL (escaped); no contact data in logs', async () => {
		const { lines, ctx } = capture();
		const now = new Date('2026-10-15T10:00:00Z');
		const before = sent().length;

		const { id } = await PartnersDomain.createLead(input, ctx(now));
		leads.push(id);

		const row = await prisma.leads.findUniqueOrThrow({ where: { id } });
		expect(row).toMatchObject({
			company: input.company,
			email: input.email,
			interest: 'vet_partner',
			status: 'new',
		});
		expect(row.consent_at).toEqual(now);
		expect(row.region_interest).toBeNull();
		const mails = sent().slice(before);
		expect(mails).toHaveLength(1);
		expect(mails[0]!.to).toBe('leads@test.invalid');
		expect(mails[0]!.subject).toBe('Novo povpraševanje: Ambulanta <Kranj> d.o.o.');
		expect(mails[0]!.html).toContain('Ambulanta &lt;Kranj&gt; d.o.o.');
		expect(mails[0]!.html).not.toContain('<Kranj>');
		expect(mails[0]!.text).toContain(input.email);
		for (const value of PII) expect(lines.join('\n')).not.toContain(value);
	});

	it('a failing email still answers with the stored lead and logs only its id', async () => {
		vi.spyOn(adapters.email, 'send').mockRejectedValue(new Error('brevo: HTTP 500'));
		const { lines, ctx } = capture();

		const { id } = await PartnersDomain.createLead(input, ctx());
		leads.push(id);

		expect(await prisma.leads.findUnique({ where: { id } })).not.toBeNull();
		const log = lines.join('\n');
		expect(log).toContain(id);
		expect(log).toContain('lead notification email failed');
		for (const value of PII) expect(log).not.toContain(value);
	});
});
