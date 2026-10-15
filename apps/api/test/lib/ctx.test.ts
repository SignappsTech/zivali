// userCtx(req | actor) and systemCtx() (ADR-020 ctx): actor, locale, hashes, now, jobs, logger, adapters.
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { hashKey } from '../../lib/crypto.ts';
import { systemCtx, userCtx, type Actor } from '../../lib/ctx.ts';
import { jobs } from '../../lib/jobs.ts';
import { optionalAuth } from '../../middleware/auth.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import { testApp } from '../helpers/app.ts';
import { signTestToken } from '../helpers/token.ts';

const sub = randomUUID();
afterAll(async () => {
	await prisma.profiles.deleteMany({ where: { id: sub } });
});

const app = testApp((a) => {
	a.get('/ctx', optionalAuth, (req, res) => {
		const { actor, locale, ip_hash, device_hash, now } = userCtx(req);
		res.json({ actor, locale, ip_hash, device_hash, now: now.toISOString() });
	});
});

describe('systemCtx', () => {
	it('has no actor, the default locale, a clock, logger, adapters and the job sender', () => {
		const ctx = systemCtx();
		expect(ctx).toMatchObject({ actor: null, locale: 'sl', jobs });
		expect(ctx.now).toBeInstanceOf(Date);
		expect(ctx.logger.info).toBeTypeOf('function');
		expect(ctx.adapters.storage).toBeDefined();
	});
});

describe('userCtx', () => {
	it('from an actor (scripts, tests): actor and its locale', () => {
		const actor: Actor = {
			user_id: sub,
			role: 'ADMIN',
			is_anonymous: false,
			aal: 'aal2',
			email_verified: true,
			locale: 'en',
		};
		expect(userCtx(actor)).toMatchObject({ actor, locale: 'en' });
	});

	it('from a request: actor, Accept-Language before the profile locale, hashed IP and device id', async () => {
		const token = await signTestToken({ sub, locale: 'en' });
		const device = randomUUID();
		const res = await request(app)
			.get('/ctx')
			.set('Authorization', `Bearer ${token}`)
			.set('Accept-Language', 'sl-SI,sl;q=0.9,en;q=0.5')
			.set('x-device-id', device);
		expect(res.body.actor).toMatchObject({ user_id: sub, locale: 'en' });
		expect(res.body.locale).toBe('sl');
		expect(res.body.device_hash).toBe(hashKey(`device:${device}`));
		expect(res.body.ip_hash).toMatch(/^[\w-]{43}$/);
		expect(JSON.stringify(res.body)).not.toContain(device);

		const fallback = await request(app)
			.get('/ctx')
			.set('Authorization', `Bearer ${token}`)
			.set('Accept-Language', 'de');
		expect(fallback.body.locale).toBe('en');
		const signedOut = await request(app).get('/ctx');
		expect(signedOut.body).toMatchObject({ actor: null, locale: 'sl' });
	});
});
