// TASK-38.2: GET /v1/partners/stats, POST /v1/leads and GET /v1/admin/leads (C14) with Supertest: public caching and
// masked values, lead validation, captcha, the 3/hour per IP rate limit, and the admin guards and cursor.
import { randomInt } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const users: string[] = [];
const leads: string[] = [];

async function caller(role: USER_ROLE, claims: TestTokenClaims = {}) {
	const id = await createAuthUser();
	users.push(id);
	await prisma.profiles.create({ data: { id, role } });
	return { id, auth: `Bearer ${await signTestToken({ sub: id, ...claims })}` };
}

// A fresh client IP per call site (trust proxy 1), so rate-limit windows never leak between tests or runs.
const freshIp = () => `198.51.${randomInt(0, 255)}.${randomInt(1, 255)}`;
const lead = {
	company: 'Ambulanta Kranj d.o.o.',
	contact_name: 'Ana Novak',
	email: 'ana.novak@example.si',
	interest: 'ad',
	message: 'Zanima nas oglas na Gorenjskem.',
	consent: true,
	captcha_token: 'ok',
	locale: 'sl',
};
const postLead = (body: object, ip: string) => request(app).post('/v1/leads').set('X-Forwarded-For', ip).send(body);

beforeAll(async () => {
	if (!(await prisma.regions.count())) await seedGeo();
}, 120_000);

afterAll(async () => {
	await prisma.leads.deleteMany({ where: { id: { in: leads } } });
	await prisma.audit_log.deleteMany({ where: { actor_id: { in: users } } });
	await deleteAuthUsers(users);
});

describe('GET /v1/partners/stats', () => {
	it('is public, cached for an hour, with every value 0, at least 5 or "<5"', async () => {
		const res = await request(app).get('/v1/partners/stats').expect(200);
		expect(res.headers['cache-control']).toBe('public, max-age=3600');
		expect(Object.keys(res.body).sort()).toEqual(['by_region', 'generated_at', 'pilot', 'totals']);
		expect(res.body.by_region).toHaveLength(12);
		const values = [res.body.totals, ...res.body.by_region].flatMap((c) => [
			c.users,
			c.active_reports,
			c.reunions_90d,
		]);
		for (const value of values) expect(value === '<5' || value === 0 || value >= 5).toBe(true);
	});
});

describe('POST /v1/leads', () => {
	it.each([
		['interest outside ad, vet_partner, unsure', { interest: 'other' }],
		['no consent', { consent: false }],
		['no captcha token', { captcha_token: undefined }],
		['an invalid email', { email: 'ana@' }],
		['a message over 2000 characters', { message: 'x'.repeat(2001) }],
		['an empty company', { company: ' ' }],
	])('%s is VALIDATION', async (_case, change) => {
		const res = await postLead({ ...lead, ...change }, freshIp());
		expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
	});

	it('a failed captcha is CAPTCHA_FAILED', async () => {
		const res = await postLead({ ...lead, captcha_token: 'fail' }, freshIp());
		expect([res.status, res.body.error.code]).toEqual([422, 'CAPTCHA_FAILED']);
	});

	it('accepts every interest and answers 201 { id }', async () => {
		for (const interest of ['ad', 'vet_partner', 'unsure']) {
			const res = await postLead({ ...lead, interest, phone: '+38640111222' }, freshIp()).expect(201);
			expect(Object.keys(res.body)).toEqual(['id']);
			leads.push(res.body.id);
			expect((await prisma.leads.findUniqueOrThrow({ where: { id: res.body.id } })).interest).toBe(interest);
		}
	});

	it('is rate limited to 3 per hour per IP (RATE_LIMITED with Retry-After)', async () => {
		const ip = freshIp();
		for (let i = 0; i < 3; i++) leads.push((await postLead(lead, ip).expect(201)).body.id);
		const res = await postLead(lead, ip);
		expect([res.status, res.body.error.code]).toEqual([429, 'RATE_LIMITED']);
		expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
		// Another IP is not affected.
		leads.push((await postLead(lead, freshIp()).expect(201)).body.id);
	});
});

describe('GET /v1/admin/leads', () => {
	it.each([
		['a signed-out visitor', null, 401, 'UNAUTHENTICATED'],
		['a user (aal2)', { role: 'USER', aal: 'aal2' }, 403, 'FORBIDDEN'],
		['a moderator (aal2)', { role: 'MODERATOR', aal: 'aal2' }, 403, 'FORBIDDEN'],
		['an admin without TOTP', { role: 'ADMIN', aal: 'aal1' }, 403, 'AAL2_REQUIRED'],
	] as const)('%s gets %s', async (_who, who, status, code) => {
		const req = request(app).get('/v1/admin/leads');
		if (who) req.set('Authorization', (await caller(who.role, { aal: who.aal })).auth);
		const res = await req;
		expect([res.status, res.body.error.code]).toEqual([status, code]);
	});

	it('an admin with TOTP pages through the leads, newest first; the read is audited', async () => {
		const admin = await caller('ADMIN', { aal: 'aal2' });
		const first = (await postLead({ ...lead, company: 'Prvi d.o.o.' }, freshIp()).expect(201)).body.id;
		const second = (await postLead({ ...lead, company: 'Drugi d.o.o.' }, freshIp()).expect(201)).body.id;
		leads.push(first, second);
		const list = (query: object) =>
			request(app).get('/v1/admin/leads').query(query).set('Authorization', admin.auth).expect(200);

		const page1 = (await list({ limit: 1 })).body;
		expect(page1.items).toHaveLength(1);
		expect(page1.items[0]).toMatchObject({ id: second, company: 'Drugi d.o.o.', email: lead.email, phone: null });
		expect(page1.items[0].consent_at).toEqual(expect.any(String));
		const page2 = (await list({ limit: 1, cursor: page1.next_cursor })).body;
		expect(page2.items[0].id).toBe(first);
		expect(await prisma.audit_log.count({ where: { actor_id: admin.id, action: 'admin.leads.list' } })).toBe(2);
	});
});
