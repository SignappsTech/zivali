// /v1/pets (C4, C5 photo order): the permission matrix on every route, validation, the Pet DTO (owner only, chip
// normalised), PET_LIMIT over HTTP, lost reports at the limit and the optional Idempotency-Key on create.
import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Pet, PetList } from '@zivali/validation';

import { app } from '../../app.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const ids = {
	owner: randomUUID(),
	other: randomUUID(),
	anon: randomUUID(),
	modAal1: randomUUID(),
	modAal2: randomUUID(),
	admin: randomUUID(),
};
const tokens = {} as Record<keyof typeof ids, string>;
const roles: Partial<Record<string, USER_ROLE>> = {
	[ids.modAal1]: 'MODERATOR',
	[ids.modAal2]: 'MODERATOR',
	[ids.admin]: 'ADMIN',
};
type Method = 'get' | 'post' | 'patch' | 'delete' | 'put';
const call = (method: Method, path: string, token?: string, body?: object) => {
	const req = request(app)[method](path);
	if (token) req.set('Authorization', `Bearer ${token}`);
	return body ? req.send(body) : req;
};
const CHIP = `985${randomInt(100_000_000_000, 999_999_999_999)}`;
const input = { species: 'cat', name: 'Muri', chip: `${CHIP.slice(0, 3)} ${CHIP.slice(3)}`, ear_tip: true };

beforeAll(async () => {
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	tokens.owner = await signTestToken({ sub: ids.owner });
	tokens.other = await signTestToken({ sub: ids.other });
	tokens.anon = await signTestToken({ sub: ids.anon, is_anonymous: true });
	tokens.modAal1 = await signTestToken({ sub: ids.modAal1 });
	tokens.modAal2 = await signTestToken({ sub: ids.modAal2, aal: 'aal2' });
	tokens.admin = await signTestToken({ sub: ids.admin, aal: 'aal2' });
});

afterAll(async () => {
	const users = Object.values(ids);
	await prisma.reports.deleteMany({ where: { created_by: { in: users } } });
	await prisma.idempotency_keys.deleteMany({ where: { user_id: { in: users } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

describe('permission matrix', () => {
	it('lets only the owner use each route: 401 signed out or anonymous, 403 for other users and staff', async () => {
		const created = await call('post', '/v1/pets', tokens.owner, input);
		expect(created.status).toBe(201);
		const id = created.body.id as string;
		const routes: [Method, string, object?][] = [
			['get', `/v1/pets/${id}`],
			['patch', `/v1/pets/${id}`, { name: 'Taken' }],
			['post', `/v1/pets/${id}/archive`],
			['put', `/v1/pets/${id}/photos`, { photo_ids: [] }],
			['delete', `/v1/pets/${id}`],
		];
		for (const [method, path, body] of [...routes, ['get', '/v1/pets'], ['post', '/v1/pets', input]] as const) {
			for (const token of [undefined, tokens.anon]) {
				const res = await call(method, path, token, body);
				expect(res.status, `${method} ${path}`).toBe(401);
				expect(res.body.error.code).toBe('UNAUTHENTICATED');
			}
		}
		for (const who of ['other', 'modAal1', 'modAal2', 'admin'] as const) {
			for (const [method, path, body] of routes) {
				const res = await call(method, path, tokens[who], body);
				expect(res.status, `${who} ${method} ${path}`).toBe(403);
				expect(res.body.error.code).toBe('FORBIDDEN');
			}
			// Their own list is empty: nobody else's pet shows.
			expect((await call('get', '/v1/pets', tokens[who])).body).toEqual({ items: [] });
		}
		expect(await prisma.pets.findUnique({ where: { id } })).toMatchObject({ name: 'Muri', archived_at: null });

		for (const [method, path, body] of routes) {
			const res = await call(method, path, tokens.owner, body);
			expect(res.status, `owner ${method} ${path}`).toBe(method === 'delete' ? 204 : 200);
		}
		expect((await call('get', `/v1/pets/${id}`, tokens.owner)).status).toBe(404);
	});
});

describe('owner CRUD', () => {
	it('creates, lists, edits and archives a pet; responses are the owner-only Pet DTO, never cached', async () => {
		const created = await call('post', '/v1/pets', tokens.owner, { ...input, chip_registered_crhz: 'no' });
		expect(created.status).toBe(201);
		expect(created.headers['cache-control']).toBe('private, no-store');
		const pet = Pet.parse(created.body);
		expect(pet).toMatchObject({
			species: 'cat',
			name: 'Muri',
			chip_number: CHIP,
			chip_status: 'valid',
			chip_registered_crhz: 'no',
			ear_tip: true,
			lifestyle: null,
			photos: [],
			archived_at: null,
		});
		expect(created.body).not.toHaveProperty('owner_id');

		const list = await call('get', '/v1/pets', tokens.owner);
		expect(list.headers['cache-control']).toBe('private, no-store');
		expect(PetList.parse(list.body).items.map((p) => p.id)).toContain(pet.id);

		const patched = await call('patch', `/v1/pets/${pet.id}`, tokens.owner, {
			lifestyle: 'indoor',
			chip: 'not a chip',
			notes: null,
		});
		expect(patched.status).toBe(200);
		expect(patched.body).toMatchObject({ lifestyle: 'indoor', chip_number: null, chip_status: 'invalid' });

		const archived = await call('post', `/v1/pets/${pet.id}/archive`, tokens.owner);
		expect(archived.status).toBe(200);
		expect(Date.parse(archived.body.archived_at)).not.toBeNaN();
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});

	it('validates body and params', async () => {
		const missingName = await call('post', '/v1/pets', tokens.owner, { species: 'dog' });
		expect(missingName.status).toBe(400);
		expect(missingName.body.error.code).toBe('VALIDATION');
		const badCrhz = await call('post', '/v1/pets', tokens.owner, { ...input, chip_registered_crhz: 'maybe' });
		expect(badCrhz.status).toBe(400);
		const dogEarTip = await call('post', '/v1/pets', tokens.owner, { species: 'dog', name: 'Rex', ear_tip: true });
		expect(dogEarTip.status).toBe(400);
		expect(dogEarTip.body.error.issues).toEqual([{ path: 'ear_tip', message: 'Cats only' }]);
		expect((await call('get', '/v1/pets/not-a-uuid', tokens.owner)).status).toBe(400);
		const tooMany = await call('put', `/v1/pets/${randomUUID()}/photos`, tokens.owner, {
			photo_ids: Array.from({ length: 6 }, () => randomUUID()),
		});
		expect(tooMany.status).toBe(400);
		expect(await prisma.pets.count({ where: { owner_id: ids.owner } })).toBe(0);
	});
});

describe('free limit', () => {
	it('answers 409 CONFLICT with details.code PET_LIMIT over the limit, and still takes a lost report', async () => {
		for (const name of ['One', 'Two'])
			expect((await call('post', '/v1/pets', tokens.owner, { species: 'dog', name })).status).toBe(201);
		const third = await call('post', '/v1/pets', tokens.owner, { species: 'dog', name: 'Three' });
		expect(third.status).toBe(409);
		expect(third.body.error).toMatchObject({ code: 'CONFLICT', details: { code: 'PET_LIMIT', limit: 2 } });

		const photo = await prisma.photos.create({
			data: { owner_id: ids.owner, sha256: randomBytes(32).toString('hex'), width: 800, height: 600, bytes: 1 },
		});
		const lost = await request(app)
			.post('/v1/reports')
			.set('Authorization', `Bearer ${tokens.owner}`)
			.set('Idempotency-Key', randomUUID())
			.send({
				type: 'lost',
				species: 'dog',
				name: 'Three',
				location: { lat: 46.0514, lng: 14.506 },
				event_at: new Date(Date.now() - 3600_000).toISOString(),
				photo_ids: [photo.id],
			});
		expect(lost.status).toBe(201);
		expect(await prisma.pets.count({ where: { owner_id: ids.owner } })).toBe(2);
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});
});

describe('Idempotency-Key (C1, TASK-16.9)', () => {
	const post = (key: string, body: object, token = tokens.owner) =>
		call('post', '/v1/pets', token).set('Idempotency-Key', key).send(body);
	const count = () => prisma.pets.count({ where: { owner_id: ids.owner } });

	it('replays the first pet to a retry after a lost response: one pet, Idempotent-Replayed', async () => {
		const key = randomUUID();
		const first = await post(key, { species: 'dog', name: 'Rex' });
		expect(first.status).toBe(201);
		expect(first.headers['idempotent-replayed']).toBeUndefined();
		const retry = await post(key, { species: 'dog', name: 'Rex' });
		expect(retry.status).toBe(201);
		expect(retry.headers['idempotent-replayed']).toBe('true');
		expect(retry.body).toEqual(first.body);
		expect(await count()).toBe(1);
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});

	it('answers CONFLICT to the same key with another body or from another user; an edit with a new key creates', async () => {
		const key = randomUUID();
		expect((await post(key, { species: 'dog', name: 'Rex' })).status).toBe(201);
		const edited = await post(key, { species: 'dog', name: 'Rexi' });
		expect(edited.status).toBe(409);
		expect(edited.body.error.code).toBe('CONFLICT');
		const foreign = await post(key, { species: 'dog', name: 'Rex' }, tokens.other);
		expect(foreign.status).toBe(409);
		expect(await prisma.pets.count({ where: { owner_id: ids.other } })).toBe(0);
		expect(await count()).toBe(1);

		const fresh = await post(randomUUID(), { species: 'dog', name: 'Rexi' });
		expect(fresh.status).toBe(201);
		expect(fresh.body.name).toBe('Rexi');
		expect(await count()).toBe(2);
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});

	it('refuses a key that is not a UUID with VALIDATION and creates nothing; no key still creates', async () => {
		const bad = await post('not-a-uuid', { species: 'dog', name: 'Rex' });
		expect(bad.status).toBe(400);
		expect(bad.body.error).toMatchObject({
			code: 'VALIDATION',
			issues: [{ path: 'headers.idempotency-key', message: 'Idempotency-Key must be a UUID' }],
		});
		expect(await count()).toBe(0);
		expect((await call('post', '/v1/pets', tokens.owner, { species: 'dog', name: 'Rex' })).status).toBe(201);
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});

	it('replays PET_LIMIT to its key even after a pet is archived, so clients drop the key; a new key creates', async () => {
		for (const name of ['One', 'Two'])
			expect((await post(randomUUID(), { species: 'dog', name })).status).toBe(201);
		const key = randomUUID();
		const limited = await post(key, { species: 'dog', name: 'Three' });
		expect(limited.status).toBe(409);
		expect(limited.body.error).toMatchObject({ code: 'CONFLICT', details: { code: 'PET_LIMIT', limit: 2 } });

		const one = await prisma.pets.findFirstOrThrow({ where: { owner_id: ids.owner, name: 'One' } });
		expect((await call('post', `/v1/pets/${one.id}/archive`, tokens.owner)).status).toBe(200);
		const replayed = await post(key, { species: 'dog', name: 'Three' });
		expect(replayed.status).toBe(409);
		expect(replayed.headers['idempotent-replayed']).toBe('true');
		expect(replayed.body.error.details).toMatchObject({ code: 'PET_LIMIT' });

		const next = await post(randomUUID(), { species: 'dog', name: 'Three' });
		expect(next.status).toBe(201);
		expect(await count()).toBe(3);
		await prisma.pets.deleteMany({ where: { owner_id: ids.owner } });
	});
});
