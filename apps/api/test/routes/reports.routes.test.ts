// GET /v1/reports/:code (C4): public whitelist, owner view for managers, GONE and NOT_FOUND, permission matrix.
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PublicReport, ReportOwnerView } from '@zivali/validation';

import { app } from '../../app.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';
import { signTestToken } from '../helpers/token.ts';

const ids = {
	owner: randomUUID(),
	finder: randomUUID(),
	other: randomUUID(),
	anon: randomUUID(),
	mod: randomUUID(),
	admin: randomUUID(),
};
const actor = (user_id: string, is_anonymous = false): Actor => ({
	user_id,
	role: 'USER',
	is_anonymous,
	aal: 'aal1',
	email_verified: !is_anonymous,
	locale: 'sl',
});
const CHIP = '705098100000077';
const EMAIL = 'finder-contact@test.invalid';
const DAY = 24 * 3600 * 1000;
const codes = {} as Record<
	'lost' | 'found' | 'sighting' | 'hidden' | 'removed' | 'held' | 'closedOld' | 'closedRecent' | 'reunitedOld',
	string
>;

const create = async (key: keyof typeof codes, user: Actor, input: Partial<NewReport>) => {
	const { id, short_code } = await ReportsDomain.insertReport(
		{
			type: 'lost',
			species: 'dog',
			location: { lat: 46.0569, lng: 14.5058 },
			event_at: new Date(Date.now() - DAY),
			...input,
		},
		userCtx(user)
	);
	codes[key] = short_code;
	return id;
};
const get = (code: string, token?: string, headers: Record<string, string> = {}) => {
	const req = request(app).get(`/v1/reports/${code}`).set(headers);
	return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

beforeAll(async () => {
	const roles: Record<string, USER_ROLE> = { [ids.mod]: 'MODERATOR', [ids.admin]: 'ADMIN' };
	await prisma.profiles.createMany({
		data: Object.values(ids).map((id) => ({ id, role: roles[id] ?? 'USER', is_anonymous: id === ids.anon })),
	});
	const owner = actor(ids.owner);
	const lostId = await create('lost', owner, {
		name: 'Piki',
		chip: CHIP,
		collar: 'rdeča ovratnica z zvoncem',
		circumstances: 'Ušel med sprehodom ob Ljubljanici.',
		reward_eur: 100,
		reward_note: 'Za pomoč pri iskanju',
		breed_codes: ['dog.beagle'],
		colours: ['brown', 'white'],
	});
	await prisma.reports.update({
		where: { id: lostId },
		data: { manage_token_hash: randomBytes(32), boosted_until: new Date(Date.now() + DAY) },
	});
	await prisma.report_contacts.create({ data: { report_id: lostId, email: EMAIL } });
	await prisma.photos.createMany({
		data: [0, 1, 2].map((position) => ({
			owner_id: ids.owner,
			report_id: lostId,
			position,
			sha256: randomBytes(32).toString('hex'),
			width: 800,
			height: 600,
			bytes: 50_000,
			status: position === 2 ? 'accepted' : 'published',
			public_display_url: position === 2 ? null : `https://media.test/r/${lostId}/${position}/display.jpg`,
			public_thumb_url: position === 2 ? null : `https://media.test/r/${lostId}/${position}/thumb.webp`,
		})),
	});
	await create('found', actor(ids.anon, true), { type: 'found', species: 'cat', source: 'anonymous' });
	await create('sighting', actor(ids.finder), { type: 'sighted', linked_report_id: lostId });
	for (const [key, data] of [
		['hidden', { moderation_state: 'hidden' }],
		['removed', { moderation_state: 'removed' }],
		['held', { moderation_state: 'held' }],
		['closedOld', { status: 'closed', close_reason: 'gave_up', closed_at: new Date(Date.now() - 31 * DAY) }],
		[
			'closedRecent',
			{ status: 'closed', close_reason: 'found_elsewhere', closed_at: new Date(Date.now() - 5 * DAY) },
		],
		['reunitedOld', { status: 'reunited', reunited_at: new Date(Date.now() - 40 * DAY) }],
	] as const) {
		const id = await create(key, owner, {});
		await prisma.reports.update({ where: { id }, data });
	}
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: { in: Object.values(ids) } } });
	await prisma.profiles.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

describe('GET /v1/reports/:code, public read model', () => {
	it('returns only the PublicReport whitelist: fuzzed area, no exact point, chip, token or contact data', async () => {
		const res = await get(codes.lost);
		expect(res.status).toBe(200);
		expect(Object.keys(res.body).every((key) => key in PublicReport.shape)).toBe(true);
		for (const key of ['location', 'chip_number', 'manage_token_hash', 'created_by', 'manager_role', 'reward_eur'])
			expect(res.body).not.toHaveProperty(key);
		const raw = JSON.stringify(res.body);
		expect(raw).not.toContain(CHIP);
		expect(raw).not.toContain(EMAIL);
		expect(raw).not.toContain(ids.owner);
		expect(res.body).toMatchObject({
			short_code: codes.lost,
			type: 'lost',
			name: 'Piki',
			has_chip: true,
			collar_described: true,
			reward: { eur: 100, note: 'Za pomoč pri iskanju' },
			area: { radius_m: 500 },
			municipality_slug: 'ljubljana',
			region_slug: 'osrednjeslovenska',
			in_slovenia: true,
			boosted: true,
			is_mine: false,
		});
	});

	it('lists only published photos, in order, with alt text in the request language', async () => {
		const sl = await get(codes.lost);
		expect(sl.body.photos).toEqual([
			expect.objectContaining({
				url: expect.stringContaining('/0/display.jpg'),
				alt: 'Pogrešani pes Piki, fotografija 1 od 2',
			}),
			expect.objectContaining({ url: expect.stringContaining('/1/display.jpg'), width: 800, height: 600 }),
		]);
		const en = await get(codes.lost, undefined, { 'Accept-Language': 'en' });
		expect(en.body.photos[0].alt).toBe('Lost dog Piki, photo 1 of 2');
	});

	it('shows found and sighted reports without name or reward, with the 150 m circle and the linked report', async () => {
		const found = await get(codes.found);
		expect(found.status).toBe(200);
		expect(found.body).not.toHaveProperty('reward');
		expect(found.body).not.toHaveProperty('name');
		expect(found.body).toMatchObject({ species: 'cat', area: { radius_m: 150 }, has_chip: false, boosted: false });
		const sighting = await get(codes.sighting);
		expect(sighting.body.linked_report_code).toBe(codes.lost);
	});

	it('answers GONE for hidden, removed and long-closed reports, NOT_FOUND for held and unknown codes', async () => {
		for (const [key, reason] of [
			['hidden', 'hidden'],
			['removed', 'removed'],
			['closedOld', 'closed'],
			['reunitedOld', 'closed'],
		] as const) {
			const res = await get(codes[key]);
			expect(res.status).toBe(410);
			expect(res.body.error).toMatchObject({ code: 'GONE', details: { reason } });
		}
		expect((await get(codes.closedRecent)).status).toBe(200);
		expect((await get(codes.held)).body.error.code).toBe('NOT_FOUND');
		const unknown = await get('Zz9Zz9Zz');
		expect(unknown.status).toBe(404);
		expect(unknown.body.error.code).toBe('NOT_FOUND');
	});

	it('rejects a malformed code with VALIDATION', async () => {
		const res = await get('not-a-code');
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('VALIDATION');
	});
});

describe('GET /v1/reports/:code, permission matrix', () => {
	const callers: Record<string, () => Promise<string | undefined>> = {
		'anonymous visitor': async () => undefined,
		'anonymous user': () => signTestToken({ sub: ids.anon, is_anonymous: true }),
		'other user': () => signTestToken({ sub: ids.other }),
		'moderator aal1': () => signTestToken({ sub: ids.mod }),
		'moderator aal2': () => signTestToken({ sub: ids.mod, aal: 'aal2' }),
		'admin aal2': () => signTestToken({ sub: ids.admin, aal: 'aal2' }),
	};

	for (const [name, token] of Object.entries(callers)) {
		it(`${name}: PublicReport only, and GONE for a hidden report`, async () => {
			const auth = await token();
			const res = await get(codes.lost, auth);
			expect(res.status).toBe(200);
			expect(res.body.is_mine).toBe(false);
			expect(res.body).not.toHaveProperty('chip_number');
			expect(res.body).not.toHaveProperty('location');
			expect((await get(codes.hidden, auth)).status).toBe(410);
		});
	}

	it('owner: ReportOwnerView with the stored coarsened point, chip and reward fields', async () => {
		const res = await get(codes.lost, await signTestToken({ sub: ids.owner }));
		expect(res.status).toBe(200);
		expect(ReportOwnerView.safeParse(res.body).success).toBe(true);
		expect(res.body).toMatchObject({
			is_mine: true,
			manager_role: 'owner',
			moderation_state: 'visible',
			chip_number: CHIP,
			chip_status: 'valid',
			collar: 'rdeča ovratnica z zvoncem',
			reward_eur: 100,
			reward_note: 'Za pomoč pri iskanju',
			contact_pref: 'chat_only',
			location: { lat: expect.any(Number), lng: expect.any(Number) },
		});
		expect(JSON.stringify(res.body)).not.toContain(EMAIL);
	});

	it('managers still see their hidden, held and long-closed reports', async () => {
		const token = await signTestToken({ sub: ids.owner });
		for (const key of ['hidden', 'held', 'closedOld'] as const) {
			const res = await get(codes[key], token);
			expect(res.status).toBe(200);
			expect(res.body.manager_role).toBe('owner');
		}
		expect((await get(codes.hidden, token)).body.moderation_state).toBe('hidden');
	});

	it('anonymous finder: owner view (finder) of their own found report', async () => {
		const res = await get(codes.found, await signTestToken({ sub: ids.anon, is_anonymous: true }));
		expect(res.body).toMatchObject({ is_mine: true, manager_role: 'finder', chip_status: 'none' });
	});
});
