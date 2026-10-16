// TASK-34.7: C1 says every staff call is audited, reads and presigns included. Each read below writes one entry with the
// actor, the action and the target, and nothing from the query or the response (no PII, no storage keys).
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken } from '../helpers/token.ts';

const TAG = `zz-readaudit-${randomUUID().slice(0, 8)}`;
const adminId = await createAuthUser();
await prisma.profiles.create({ data: { id: adminId, role: 'ADMIN' } });
const auth = `Bearer ${await signTestToken({ sub: adminId, aal: 'aal2' })}`;
const get = (path: string) => request(app).get(path).set('Authorization', auth);

afterAll(async () => {
	await prisma.ads.deleteMany({ where: { title: { startsWith: TAG } } });
	await prisma.audit_log.deleteMany({ where: { actor_id: adminId } });
	await prisma.profiles.delete({ where: { id: adminId } });
	await deleteAuthUsers([adminId]);
});

const entries = (action: string) => prisma.audit_log.findMany({ where: { actor_id: adminId, action } });

describe('staff reads and presigns are audited', () => {
	it('ads list, stats and image presign', async () => {
		const created = await request(app)
			.post('/v1/admin/ads')
			.set('Authorization', auth)
			.send({
				title: `${TAG} Ambulanta`,
				body: 'Dežurni veterinar 24/7.',
				cta: 'Pokličite',
				link_url: 'https://example.com/a',
				image_alt: 'Veterinarka pregleduje psa',
				locales: ['sl'],
				slots: ['detail'],
				starts_at: '2093-01-01T00:00:00.000Z',
				ends_at: '2093-02-01T00:00:00.000Z',
			});
		expect(created.status).toBe(201);
		const id = created.body.id as string;

		expect((await get('/v1/admin/ads?limit=5')).status).toBe(200);
		expect(await entries('admin.ads.list')).toMatchObject([{ target_type: 'ad', target_id: null, diff: null }]);

		expect((await get(`/v1/admin/ads/${id}/stats?from=2093-01-01&to=2093-01-02`)).status).toBe(200);
		expect(await entries('admin.ads.stats')).toMatchObject([{ target_type: 'ad', target_id: id, diff: null }]);

		const sha256 = 'cd'.repeat(32);
		const presign = await request(app)
			.post(`/v1/admin/ads/${id}/image`)
			.set('Authorization', auth)
			.send({ sha256, width: 1200, height: 900, bytes: 200_000, content_type: 'image/jpeg' });
		expect(presign.status).toBe(200);
		const presigned = await entries('admin.ads.image_presign');
		expect(presigned).toMatchObject([{ target_type: 'ad', target_id: id, diff: null }]);
		expect(JSON.stringify(presigned)).not.toContain(sha256);
	});

	it('a failed read writes no entry', async () => {
		const before = (await entries('admin.ads.stats')).length;
		expect((await get(`/v1/admin/ads/${randomUUID()}/stats?from=2093-01-01&to=2093-01-02`)).status).toBe(404);
		expect((await entries('admin.ads.stats')).length).toBe(before);
	});

	it("directory reads: shelters, municipality assignments, a shelter's changes", async () => {
		expect((await get('/v1/admin/shelters')).status).toBe(200);
		expect(await entries('admin.shelters.list')).toMatchObject([{ target_type: 'shelter', diff: null }]);

		expect((await get('/v1/admin/municipality-shelters')).status).toBe(200);
		expect(await entries('admin.municipality_shelters.list')).toMatchObject([
			{ target_type: 'municipality_shelter', diff: null },
		]);

		const shelter = await prisma.shelters.findFirst();
		if (!shelter) return; // an unseeded database has nothing to read
		expect((await get(`/v1/admin/shelters/${shelter.slug}/changes`)).status).toBe(200);
		expect(await entries('admin.shelters.changes')).toMatchObject([
			{ target_type: 'shelter', target_id: shelter.id, diff: null },
		]);
	});
});
