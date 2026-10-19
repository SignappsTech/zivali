// End-to-end delivery of nearby alerts (C10 §Nearby alerts: 1000 recipients < 60 s; TASK-23.5): one alerts.fanout job
// through the real worker loop (work(runJob), NOTIFY_SEND_CONCURRENCY notify.send pollers) until every recipient has
// the inbox row, the push and the email (all opted in: the worst case). Mock push and email providers whatever
// .env.local selects, each call delayed by a simulated provider round trip (PERF_PROVIDER_MS, default 150). On demand
// only (`pnpm --filter api test:perf`, a worktree sets TEST_DATABASE_URL to its scratch database), never in pnpm verify.
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { mockEmail } from '../../adapters/email/mock.ts';
import { adapters } from '../../adapters/index.ts';
import { mockPush } from '../../adapters/push/mock.ts';
import { Prisma } from '../../generated/client.ts';
import { runJob } from '../../jobs/index.ts';
import { config } from '../../lib/config.ts';
import { jobs, startJobs, stopJobs, work } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';

const RECIPIENTS = 1000;
const BUDGET_S = 60;
const PROVIDER_MS = Number(process.env.PERF_PROVIDER_MS ?? 150);
// Fixed ids, so a run that died half-way is cleaned up by the next one.
const USERS = Array.from({ length: RECIPIENTS }, (_, i) => `00000000-0000-4000-8235-${String(i).padStart(12, '0')}`);
const REPORT = '00000000-0000-4000-8235-100000000000';
// Celje: no fixture subscriptions within 25 km.
const P = Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(15.2604, 46.2309), 4326)::extensions.geography`;
const mine = (address: string) => address.includes('perf-');

async function cleanup() {
	await prisma.$executeRaw`
		delete from pgboss.job where name in ('alerts.fanout', 'notify.send')
			and (data->>'report_id' = ${REPORT} or data->>'dedupe_key' = ${`nearby:${REPORT}`})`;
	await prisma.$executeRaw`delete from app.reports where id = ${REPORT}::uuid`;
	// Tokens, prefs, subscriptions, deliveries, inbox and outbox rows go with the profiles (on delete cascade).
	await prisma.$executeRaw`delete from app.profiles where id = any(${USERS}::uuid[])`;
	await prisma.$executeRaw`delete from auth.users where id = any(${USERS}::uuid[])`;
}

async function seed() {
	await cleanup();
	await prisma.$executeRaw`
		insert into auth.users (id, aud, role, email, email_confirmed_at, is_anonymous, created_at, updated_at)
		select u, 'authenticated', 'authenticated', 'perf-' || u || '@example.test', now(), false, now(), now()
		from unnest(${USERS}::uuid[]) as u`;
	await prisma.profiles.createMany({ data: USERS.map((id) => ({ id })) });
	await prisma.push_tokens.createMany({
		data: USERS.map((user_id) => ({ user_id, token: `ExponentPushToken[perf-${user_id}]`, platform: 'android' })),
	});
	// Alert email is opt-in (C10).
	await prisma.notification_prefs.createMany({
		data: USERS.map((user_id) => ({ user_id, type: 'nearby_lost', email: true })),
	});
	await prisma.$executeRaw`
		insert into app.alert_subscriptions (id, user_id, center_point, radius_km, updated_at)
		select gen_random_uuid(), u, extensions.st_project(${P}, random() * 2000, radians(random() * 360)), 5, now()
		from unnest(${USERS}::uuid[]) as u`;
	await prisma.$executeRaw`
		insert into app.reports (id, short_code, type, species, status, moderation_state, event_at, exact_point,
			public_point, public_radius_m, in_slovenia)
		values (${REPORT}::uuid, 'perf2350', 'lost', 'dog', 'open', 'visible', now(), ${P}, ${P}, 500, true)`;
}

beforeAll(async () => {
	if (!['127.0.0.1', 'localhost'].includes(new URL(config.DATABASE_URL).hostname))
		throw new Error('test:perf runs on the local stack only');
	await startJobs();
	await seed();
});

afterAll(async () => {
	await stopJobs();
	await cleanup();
});

describe('nearby alerts end to end (C10, TASK-23.5)', () => {
	it(`one alerts.fanout to ${RECIPIENTS} recipients, inbox + push + email through the worker: < ${BUDGET_S} s`, async () => {
		const push = mockPush();
		const email = mockEmail();
		vi.spyOn(adapters.push, 'send').mockImplementation(async (messages) => {
			await delay(PROVIDER_MS);
			return push.send(messages);
		});
		vi.spyOn(adapters.email, 'send').mockImplementation(async (message) => {
			await delay(PROVIDER_MS);
			return email.send(message);
		});
		await work(runJob);

		const started = performance.now();
		await jobs.send('alerts.fanout', { report_id: REPORT });
		await vi.waitFor(
			() => {
				expect(push.sent!.filter((m) => mine(m.to))).toHaveLength(RECIPIENTS);
				expect(email.sent!.filter((m) => mine(m.to))).toHaveLength(RECIPIENTS);
			},
			{ timeout: 600_000, interval: 100 }
		);
		const seconds = (performance.now() - started) / 1000;
		process.stdout.write(
			`[perf] nearby alerts: ${RECIPIENTS} recipients, NOTIFY_SEND_CONCURRENCY ${config.NOTIFY_SEND_CONCURRENCY}, ` +
				`provider round trip ${PROVIDER_MS} ms: ${seconds.toFixed(1)} s\n`
		);

		const where = { user_id: { in: USERS } };
		expect(await prisma.notifications.count({ where: { ...where, type: 'nearby_lost' } })).toBe(RECIPIENTS);
		expect(await prisma.alert_deliveries.count({ where: { ...where, report_id: REPORT } })).toBe(RECIPIENTS);
		expect(seconds).toBeLessThan(BUDGET_S);
	});
});
