// TASK-89.1: directory.reminder (C18, FR-044 R-044.3): scheduled for 1 April 08:00 Europe/Ljubljana; emails the admins
// with a confirmed address the active shelters and assignments verified more than 12 months ago, escaped.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adapters } from '../../adapters/index.ts';
import { mockEmail } from '../../adapters/email/mock.ts';
import { handlers, type JobCtx } from '../../jobs/index.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { jobs, SCHEDULE_TZ, SCHEDULES } from '../../lib/jobs.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';
import { createAuthUser, deleteAuthUsers } from '../helpers/token.ts';

const STALE = 'test-reminder-stale';
const ids: string[] = [];
const started = new Date();

async function profile(role: 'ADMIN' | 'USER', email_verified = true) {
	const id = await createAuthUser({ email_verified });
	ids.push(id);
	await prisma.profiles.create({ data: { id, role } });
	return `${id}@test.invalid`;
}

/** Runs the registered handler at `now` with a recording email adapter. */
async function run(now: string) {
	const email = mockEmail();
	const ctx: JobCtx = {
		...systemCtx({ now: new Date(now), adapters: { ...adapters, email } }),
		prisma,
		send: jobs.send,
	};
	await handlers['directory.reminder'](null, ctx);
	return email.sent!;
}

beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	await seedDirectory();
	await prisma.shelters.deleteMany({ where: { slug: STALE } });
	const ljubljana = await prisma.shelters.findUniqueOrThrow({ where: { slug: 'zavetisce-ljubljana' } });
	const { id: _id, created_at: _c, updated_at: _u, ...copy } = ljubljana;
	await prisma.shelters.create({
		data: {
			...copy,
			opening_hours: [],
			slug: STALE,
			name: '<b>Test & "Co"</b>',
			verified_at: new Date('2025-09-01'),
		},
	});
}, 60_000);

afterAll(async () => {
	await prisma.shelters.deleteMany({ where: { slug: STALE } });
	await prisma.audit_log.deleteMany({ where: { action: 'directory.reminder', created_at: { gte: started } } });
	await deleteAuthUsers(ids);
});

const admin = await profile('ADMIN');
const unconfirmedAdmin = await profile('ADMIN', false);
const user = await profile('USER');

describe('directory.reminder', () => {
	it('is scheduled for 1 April 08:00 Europe/Ljubljana', () => {
		expect([SCHEDULES['directory.reminder'], SCHEDULE_TZ]).toEqual(['0 8 1 4 *', 'Europe/Ljubljana']);
	});

	it('emails confirmed admins only, listing the entries older than 12 months (escaped in HTML)', async () => {
		const sent = await run('2026-10-15T06:00:00Z');
		const to = sent.map((m) => m.to);
		expect(to).toContain(admin);
		expect(to).not.toContain(unconfirmedAdmin);
		expect(to).not.toContain(user);
		const mail = sent.find((m) => m.to === admin)!;
		expect(mail.subject).toBe('Imenik zavetišč: letna osvežitev');
		// The seed rows were verified on 2026-10-15: only the test shelter is stale.
		expect(mail.text).toContain('Zavetišča (1):\n- <b>Test & "Co"</b>, 2025-09-01');
		expect(mail.text).not.toContain('Občine');
		expect(mail.html).toContain('&lt;b&gt;Test &amp; &quot;Co&quot;&lt;/b&gt;');
		expect(mail.html).not.toContain('<b>');
		const audit = await prisma.audit_log.findFirst({
			where: { action: 'directory.reminder', created_at: { gte: started } },
			orderBy: { created_at: 'desc' },
		});
		expect(audit).toMatchObject({ actor_id: null, diff: { shelters: 1, municipalities: 0, sent: sent.length } });
	});

	it('a year after the seed lists every active shelter and all 212 municipalities', async () => {
		const sent = await run('2027-10-16T06:00:00Z');
		const mail = sent.find((m) => m.to === admin)!;
		expect(mail.text).toContain('Občine (212):');
		expect(mail.text).toContain('- Zavetišče Ljubljana, 2026-10-15');
		expect(mail.text).toContain('- Ljubljana, 2026-10-15');
	});

	it('sends nothing when every entry is younger than 12 months', async () => {
		await prisma.shelters.update({ where: { slug: STALE }, data: { active: false } });
		expect(await run('2026-10-15T06:00:00Z')).toEqual([]);
	});
});
