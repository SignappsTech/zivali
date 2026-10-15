// TASK-37.2: /v1/admin/ads (C14 §Admin, FR-031) over real auth.users rows: admin + aal2 only, validated and audited
// saves (content rule, exclusivity, the uploaded image), presigned image uploads, status changes, soft delete with a
// note, daily stats. Ads here run in far-future windows on their own, so seeded or leftover ads never collide.
import { randomUUID } from 'node:crypto';

import sharp from 'sharp';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import type { AdInput } from '@zivali/types';

import { adapters } from '../../adapters/index.ts';
import { app } from '../../app.ts';
import { AdsDomain } from '../../domains/ads/index.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { systemCtx } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const TAG = `zz-ads-${randomUUID().slice(0, 8)}`;
const ids: string[] = [];
async function actor(role: USER_ROLE | null, claims: TestTokenClaims = {}) {
	const id = await createAuthUser({ is_anonymous: claims.is_anonymous });
	ids.push(id);
	if (role) await prisma.profiles.create({ data: { id, role } });
	return { id, auth: `Bearer ${await signTestToken({ sub: id, ...claims })}` };
}

afterAll(async () => {
	await prisma.ads.deleteMany({ where: { OR: [{ created_by: { in: ids } }, { title: { startsWith: TAG } }] } });
	await prisma.audit_log.deleteMany({ where: { actor_id: { in: ids } } });
	await deleteAuthUsers(ids);
});

const admin = await actor('ADMIN', { aal: 'aal2' });
const as = (auth = admin.auth) => ({
	get: (path: string) => request(app).get(path).set('Authorization', auth),
	post: (path: string, body?: object) => request(app).post(path).set('Authorization', auth).send(body),
	put: (path: string, body: object) => request(app).put(path).set('Authorization', auth).send(body),
	delete: (path: string, body?: object) => request(app).delete(path).set('Authorization', auth).send(body),
});

let year = 2090;
/** A one-month window no other test uses. */
const window = () => {
	year += 1;
	return { starts_at: `${year}-01-01T00:00:00.000Z`, ends_at: `${year}-02-01T00:00:00.000Z` };
};
const valid = (over: Partial<AdInput> = {}): AdInput => ({
	title: `${TAG} Ambulanta`,
	body: 'Dežurni veterinar 24/7.',
	cta: 'Pokličite',
	link_url: 'https://example.com/ambulanta',
	image_alt: 'Veterinarka pregleduje psa',
	locales: ['sl'],
	slots: ['detail'],
	...window(),
	...over,
});
const createAd = async (over: Partial<AdInput> = {}) => {
	const res = await as().post('/v1/admin/ads', valid(over));
	expect(res.status).toBe(201);
	return res.body as { id: string } & Record<string, unknown>;
};
const issuePaths = (res: request.Response) => (res.body.error.issues ?? []).map((i: { path: string }) => i.path);
const image = (width: number, height: number, format: 'jpeg' | 'png') =>
	sharp({ create: { width, height, channels: 3, background: '#4a7' } })
		[format]()
		.toBuffer();
const imageMeta = {
	sha256: 'ab'.repeat(32),
	width: 1200,
	height: 900,
	bytes: 200_000,
	content_type: 'image/jpeg',
} as const;

describe('guards: admins with aal2 only', () => {
	it('answers every ad route with the staff codes for anyone else', async () => {
		const id = (await createAd()).id;
		const calls = [
			['get', '/v1/admin/ads'],
			['post', '/v1/admin/ads', valid()],
			['put', `/v1/admin/ads/${id}`, valid()],
			['post', `/v1/admin/ads/${id}/image`, imageMeta],
			['post', `/v1/admin/ads/${id}/status`, { status: 'paused' }],
			['delete', `/v1/admin/ads/${id}`, { note: 'test' }],
			['get', `/v1/admin/ads/${id}/stats?from=2026-10-01&to=2026-10-02`],
		] as const;
		const callers = [
			[undefined, 'UNAUTHENTICATED'],
			[await actor(null, { is_anonymous: true, aal: 'aal2' }), 'UNAUTHENTICATED'],
			[await actor('USER', { aal: 'aal2' }), 'FORBIDDEN'],
			[await actor('SHELTER_MEMBER', { aal: 'aal2' }), 'FORBIDDEN'],
			[await actor('MODERATOR', { aal: 'aal1' }), 'AAL2_REQUIRED'],
			[await actor('MODERATOR', { aal: 'aal2' }), 'FORBIDDEN'],
			[await actor('ADMIN', { aal: 'aal1' }), 'AAL2_REQUIRED'],
		] as const;
		for (const [caller, code] of callers)
			for (const [method, path, body] of calls) {
				const req = request(app)[method](path);
				if (caller) req.set('Authorization', caller.auth);
				const res = await (body ? req.send(body) : req);
				expect([method, path, res.body.error?.code]).toEqual([method, path, code]);
			}
		// Nothing changed.
		expect((await prisma.ads.findUniqueOrThrow({ where: { id } })).deleted_at).toBeNull();
	});
});

describe('POST and PUT /v1/admin/ads validation', () => {
	const rejected: [string, Partial<AdInput> | ((ad: AdInput) => object), string][] = [
		['missing alt text', (ad) => ({ ...ad, image_alt: undefined }), 'image_alt'],
		['too short alt text', { image_alt: 'pes' }, 'image_alt'],
		['a non-https link', { link_url: 'http://example.com' }, 'link_url'],
		['a title over 60 characters', { title: 'T'.repeat(61) }, 'title'],
		['a text over 120 characters', { body: 'B'.repeat(121) }, 'body'],
		['a CTA over 24 characters', { cta: 'C'.repeat(25) }, 'cta'],
		['an end before the start', { starts_at: '2099-02-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z' }, 'ends_at'],
		['selling animals', { title: `${TAG} Prodajam mladiče` }, 'title'],
		['giving animals away', { body: 'Mucke oddajamo v dobre roke.' }, 'body'],
		['rehoming animals', { cta: 'Puppy rehomed' }, 'cta'],
		['an unknown slot', { slots: ['report-lost' as AdInput['slots'][number]] }, 'slots.0'],
	];

	it.each(rejected)('POST rejects %s with VALIDATION and the field', async (_what, change, path) => {
		const body = typeof change === 'function' ? change(valid()) : valid(change);
		const res = await as().post('/v1/admin/ads', body);
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('VALIDATION');
		expect(issuePaths(res)).toContain(path);
	});

	it.each(rejected)('PUT rejects %s with VALIDATION and the field', async (_what, change, path) => {
		const { id } = await createAd();
		const body = typeof change === 'function' ? change(valid()) : valid(change);
		const res = await as().put(`/v1/admin/ads/${id}`, body);
		expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
		expect(issuePaths(res)).toContain(path);
	});

	it('rejects an exclusive ad overlapping another in a shared slot, on create and on edit', async () => {
		const dates = window();
		const first = await createAd({ exclusive: true, slots: ['feed'], ...dates });
		const overlap = await as().post(
			'/v1/admin/ads',
			valid({ exclusive: true, slots: ['feed', 'detail'], ...dates })
		);
		expect([overlap.status, issuePaths(overlap)]).toEqual([400, ['exclusive']]);
		expect(overlap.body.error.issues[0].message).toContain(first.id);

		const other = await createAd({ exclusive: true, slots: ['detail'], ...dates });
		const edit = await as().put(`/v1/admin/ads/${other.id}`, valid({ exclusive: true, slots: ['feed'], ...dates }));
		expect([edit.status, issuePaths(edit)]).toEqual([400, ['exclusive']]);
	});
});

describe('create and edit', () => {
	it('creates an ad (201, audited) and edits it: given fields replace, left-out fields stay, null clears', async () => {
		const input = valid({ species: ['dog'], region_ids: [8], weight: 3 });
		const created = await as().post('/v1/admin/ads', input);
		expect(created.status).toBe(201);
		expect(created.body).toEqual({
			id: expect.any(String),
			title: input.title,
			body: input.body,
			cta: input.cta,
			link_url: input.link_url,
			image_url: null,
			image_alt: input.image_alt,
			locales: ['sl'],
			slots: ['detail'],
			region_ids: [8],
			municipality_ids: null,
			species: ['dog'],
			starts_at: input.starts_at,
			ends_at: input.ends_at,
			status: 'draft',
			is_house: false,
			house_kind: null,
			exclusive: false,
			weight: 3,
			created_at: expect.any(String),
			updated_at: expect.any(String),
		});
		const { id } = created.body;
		expect(await prisma.audit_log.findFirst({ where: { target_id: id, action: 'ad.create' } })).toMatchObject({
			actor_id: admin.id,
			target_type: 'ad',
			diff: { to: { title: input.title, slots: ['detail'] } },
		});

		const { species: _species, weight: _weight, ...rest } = input;
		const edited = await as().put(`/v1/admin/ads/${id}`, { ...rest, title: `${TAG} Nova`, region_ids: null });
		expect(edited.status).toBe(200);
		expect(edited.body).toMatchObject({ title: `${TAG} Nova`, region_ids: null, species: ['dog'], weight: 3 });
		const audit = await prisma.audit_log.findFirst({ where: { target_id: id, action: 'ad.update' } });
		expect(audit?.diff).toMatchObject({
			from: { title: input.title, region_ids: [8] },
			to: { title: `${TAG} Nova`, region_ids: null },
		});

		expect((await as().put(`/v1/admin/ads/${randomUUID()}`, valid())).body.error.code).toBe('NOT_FOUND');
	});
});

describe('POST /v1/admin/ads/:id/image', () => {
	it.each([
		['not 4:3', { width: 1200, height: 800 }],
		['smaller than 1200×900', { width: 1000, height: 750 }],
		['500 KB or more', { bytes: 500 * 1024 }],
		['not JPG or PNG', { content_type: 'image/webp' }],
	])('rejects an image that is %s', async (_what, change) => {
		const { id } = await createAd();
		const res = await as().post(`/v1/admin/ads/${id}/image`, { ...imageMeta, ...change });
		expect([res.status, res.body.error.code]).toEqual([400, 'VALIDATION']);
	});

	it('presigns a PUT and leaves the ad alone; a save switches the image only after checking the uploaded file', async () => {
		const { id } = await createAd();
		const res = await as().post(`/v1/admin/ads/${id}/image`, imageMeta);
		expect(res.status).toBe(200);
		const key = `ads/${id}/${imageMeta.sha256}.jpg`;
		expect(res.body).toEqual({
			upload: {
				url: `memory://media/${key}`,
				method: 'PUT',
				headers: { 'Content-Type': 'image/jpeg' },
				expires_at: expect.any(String),
			},
			image: key,
		});
		// The live ad keeps serving what it served.
		expect((await prisma.ads.findUniqueOrThrow({ where: { id } })).image_path).toBeNull();
		expect(await prisma.audit_log.count({ where: { target_id: id, action: 'ad.image' } })).toBe(0);

		const old = `ads/${id}/${'cd'.repeat(32)}.jpg`;
		await prisma.ads.update({ where: { id }, data: { image_path: old } });
		const save = (image: string | null = key) => as().put(`/v1/admin/ads/${id}`, valid({ image }));
		const served = async () => (await prisma.ads.findUniqueOrThrow({ where: { id } })).image_path;
		const notUploaded = await save();
		expect([notUploaded.status, issuePaths(notUploaded)]).toEqual([400, ['image']]);

		const ref = { bucket: 'media' as const, key };
		await adapters.storage.put(ref, await image(1200, 800, 'png'), 'image/jpeg');
		expect(issuePaths(await save())).toEqual(['image']);
		await adapters.storage.put(ref, Buffer.from('not an image'), 'image/jpeg');
		expect(issuePaths(await save())).toEqual(['image']);
		expect(await served()).toBe(old);

		// Another ad's key, a malformed key and removing a sponsor ad's image are all rejected.
		expect(issuePaths(await save(`ads/${randomUUID()}/${imageMeta.sha256}.jpg`))).toEqual(['image']);
		expect((await save('ads/x/y.jpg')).status).toBe(400);
		expect(issuePaths(await save(null))).toEqual(['image']);
		expect(await served()).toBe(old);

		await adapters.storage.put(ref, await image(1600, 1200, 'jpeg'), 'image/jpeg');
		const ok = await save();
		expect(ok.status).toBe(200);
		expect(ok.body.image_url).toMatch(new RegExp(`/${key}$`));
		expect(await served()).toBe(key);
		expect(await prisma.audit_log.findFirst({ where: { target_id: id, action: 'ad.update' } })).toMatchObject({
			diff: { from: { image: old }, to: { image: key } },
		});

		await prisma.ads.update({ where: { id }, data: { is_house: true, house_kind: 'adopt' } });
		const removed = await as().put(`/v1/admin/ads/${id}`, { ...valid({ image: null }), is_house: true });
		expect([removed.status, removed.body.image_url]).toEqual([200, null]);

		expect((await as().post(`/v1/admin/ads/${randomUUID()}/image`, imageMeta)).status).toBe(404);
	});

	it('does not take an image on create', async () => {
		const res = await as().post('/v1/admin/ads', valid({ image: `ads/${randomUUID()}/${imageMeta.sha256}.jpg` }));
		expect([res.status, issuePaths(res)]).toEqual([400, ['image']]);
	});
});

describe('POST /v1/admin/ads/:id/status', () => {
	it('changes the status (audited); ending an ad mid-day keeps its stats', async () => {
		const { id } = await createAd({ starts_at: null, ends_at: null });
		const active = await as().post(`/v1/admin/ads/${id}/status`, { status: 'active' });
		expect([active.status, active.body.status]).toEqual([200, 'active']);
		const ctx = systemCtx();
		await AdsDomain.recordImpression({ ad_id: id, slot: 'detail', region_id: 8 }, ctx);
		await AdsDomain.recordImpression({ ad_id: id, slot: 'detail', region_id: 8 }, ctx);

		const ended = await as().post(`/v1/admin/ads/${id}/status`, { status: 'ended' });
		expect([ended.status, ended.body.status]).toEqual([200, 'ended']);
		const audit = await prisma.audit_log.findMany({
			where: { target_id: id, action: 'ad.status' },
			orderBy: { created_at: 'asc' },
		});
		expect(audit.map((entry) => entry.diff)).toEqual([
			{ from: 'draft', to: 'active' },
			{ from: 'active', to: 'ended' },
		]);
		const day = AdsDomain.statsDay(ctx.now);
		const stats = await as().get(`/v1/admin/ads/${id}/stats?from=${day}&to=${day}`);
		expect(stats.body.items).toEqual([
			{ day, slot: 'detail', region_slug: 'osrednjeslovenska', impressions: 2, clicks: 0, ctr: 0 },
		]);
	});

	it('runs the save checks when an ad goes live again; pausing or ending is always allowed', async () => {
		const dates = window();
		const old = await createAd({ exclusive: true, slots: ['sidebar'], ...dates });
		await as().post(`/v1/admin/ads/${old.id}/status`, { status: 'ended' });
		const current = await createAd({ exclusive: true, slots: ['sidebar'], ...dates });

		const back = await as().post(`/v1/admin/ads/${old.id}/status`, { status: 'active' });
		expect([back.status, issuePaths(back)]).toEqual([400, ['exclusive']]);
		// A term blocked after the ad was saved does not stop taking it down.
		await prisma.ads.update({ where: { id: current.id }, data: { title: `${TAG} Prodajam` } });
		expect((await as().post(`/v1/admin/ads/${current.id}/status`, { status: 'paused' })).status).toBe(200);
		expect(issuePaths(await as().post(`/v1/admin/ads/${current.id}/status`, { status: 'active' }))).toEqual([
			'title',
		]);
	});
});

describe('DELETE /v1/admin/ads/:id', () => {
	it('needs a note; soft-deletes (audited with the note), keeps the stats and hides the ad', async () => {
		const { id } = await createAd();
		await prisma.ad_stats_daily.create({
			data: { day: new Date('2026-10-14'), ad_id: id, slot: 'DETAIL', region_id: 0, impressions: 5, clicks: 1 },
		});
		for (const body of [undefined, {}, { note: '  ' }])
			expect((await as().delete(`/v1/admin/ads/${id}`, body)).body.error.code).toBe('VALIDATION');

		const res = await as().delete(`/v1/admin/ads/${id}`, { note: 'Campaign cancelled' });
		expect(res.status).toBe(204);
		expect((await prisma.ads.findUniqueOrThrow({ where: { id } })).deleted_at).toBeInstanceOf(Date);
		expect(await prisma.ad_stats_daily.count({ where: { ad_id: id } })).toBe(1);
		expect(await prisma.audit_log.findFirst({ where: { target_id: id, action: 'ad.delete' } })).toMatchObject({
			actor_id: admin.id,
			diff: { note: 'Campaign cancelled' },
		});

		const listed = await as().get('/v1/admin/ads');
		expect(listed.body.items.map((ad: { id: string }) => ad.id)).not.toContain(id);
		expect((await as().put(`/v1/admin/ads/${id}`, valid())).status).toBe(404);
		expect((await as().delete(`/v1/admin/ads/${id}`, { note: 'again' })).status).toBe(404);
		// Its stats stay readable for admins.
		const stats = await as().get(`/v1/admin/ads/${id}/stats?from=2026-10-14&to=2026-10-14`);
		expect([stats.status, stats.body.items.map((i: { impressions: number }) => i.impressions)]).toEqual([200, [5]]);
	});
});

describe('GET /v1/admin/ads/:id/stats', () => {
	it('returns impressions, clicks and CTR per day, slot and region within the range', async () => {
		const { id } = await createAd();
		const row = (day: string, slot: 'DETAIL' | 'FEED', region_id: number, impressions: number, clicks: number) => ({
			day: new Date(day),
			ad_id: id,
			slot,
			region_id,
			impressions,
			clicks,
		});
		await prisma.ad_stats_daily.createMany({
			data: [
				row('2026-10-01', 'DETAIL', 8, 200, 5),
				row('2026-10-01', 'DETAIL', 0, 40, 0),
				row('2026-10-02', 'FEED', 8, 0, 0),
				row('2026-10-03', 'DETAIL', 8, 10, 1),
			],
		});
		const res = await as().get(`/v1/admin/ads/${id}/stats?from=2026-10-01&to=2026-10-02`);
		expect(res.status).toBe(200);
		expect(res.body.items).toEqual([
			{ day: '2026-10-01', slot: 'detail', region_slug: null, impressions: 40, clicks: 0, ctr: 0 },
			{
				day: '2026-10-01',
				slot: 'detail',
				region_slug: 'osrednjeslovenska',
				impressions: 200,
				clicks: 5,
				ctr: 0.025,
			},
			{ day: '2026-10-02', slot: 'feed', region_slug: 'osrednjeslovenska', impressions: 0, clicks: 0, ctr: 0 },
		]);

		for (const query of ['from=2026-10-02&to=2026-10-01', 'from=2025-01-01&to=2026-10-01', 'from=2026-10-01'])
			expect((await as().get(`/v1/admin/ads/${id}/stats?${query}`)).body.error.code).toBe('VALIDATION');
		expect((await as().get(`/v1/admin/ads/${randomUUID()}/stats?from=2026-10-01&to=2026-10-02`)).status).toBe(404);
	});
});

describe('GET /v1/admin/ads', () => {
	it('lists newest first with a status filter and a cursor', async () => {
		const future = Date.parse('2099-01-01T00:00:00Z');
		await prisma.ads.createMany({
			data: Array.from({ length: 51 }, (_, i) => ({
				title: `${TAG} list ${i}`,
				body: 'Body',
				cta: 'CTA',
				link_url: 'https://example.com',
				image_alt: 'Alt text',
				slots: ['FEED' as const],
				status: 'paused',
				created_by: admin.id,
				created_at: new Date(future - i * 1000),
			})),
		});
		const page1 = await as().get('/v1/admin/ads?status=paused');
		expect(page1.status).toBe(200);
		expect(page1.body.items).toHaveLength(50);
		expect(page1.body.items.map((ad: { title: string }) => ad.title)).toEqual(
			Array.from({ length: 50 }, (_, i) => `${TAG} list ${i}`)
		);
		expect(page1.body.next_cursor).toBe(page1.body.items[49].id);
		const page2 = await as().get(`/v1/admin/ads?status=paused&cursor=${page1.body.next_cursor}`);
		expect(page2.body.items[0].title).toBe(`${TAG} list 50`);
		expect(page2.body.items.every((ad: { status: string }) => ad.status === 'paused')).toBe(true);

		expect((await as().get('/v1/admin/ads?cursor=nope')).body.error.code).toBe('VALIDATION');
	});
});
