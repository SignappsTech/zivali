// TASK-89.1: directory admin routes (C18 §Admin) over the seeded directory: admin + aal2 on every route, versioned
// and audited writes that the public endpoints show at once, stale-version and HAS_ASSIGNMENTS conflicts, deactivation
// instead of deletion, and the CSV import (both seed formats, dry run, row errors). The tests run in order and share
// state; they create shelters with the slug prefix below and restore the two municipalities they reassign.
import { readFileSync } from 'node:fs';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../../app.ts';
import type { municipality_shelters } from '../../generated/client.ts';
import type { USER_ROLE } from '../../generated/enums.ts';
import { prisma } from '../../prisma/prisma.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedDirectory from '../../prisma/seeders/05-directory.seeder.ts';
import { createAuthUser, deleteAuthUsers, signTestToken, type TestTokenClaims } from '../helpers/token.ts';

const PREFIX = 'test-admin-';
const SLUG = 'test-admin-zavetisce-cuk'; // derived from NAME
const NAME = 'Test Ađmin Zavetišče Čuk';
const INACTIVE = 'test-admin-inactive';
const TOUCHED = ['kostel', 'sodrazica'];
const seedCsv = (name: string) =>
	readFileSync(new URL(`../../prisma/seeders/data/${name}.csv`, import.meta.url), 'utf8');

const ids: string[] = [];
async function actor(role: USER_ROLE | null, claims: TestTokenClaims = {}) {
	const id = await createAuthUser({ is_anonymous: claims.is_anonymous });
	ids.push(id);
	if (role) await prisma.profiles.create({ data: { id, role } });
	return { id, auth: `Bearer ${await signTestToken({ sub: id, ...claims })}` };
}

async function removeTestShelters() {
	const shelters = await prisma.shelters.findMany({ where: { slug: { startsWith: PREFIX } } });
	const shelterIds = shelters.map((s) => s.id);
	await prisma.municipality_shelters.updateMany({
		where: { shelter_id: { in: shelterIds } },
		data: { shelter_id: null, status: 'UNCONFIRMED' },
	});
	await prisma.directory_changes.deleteMany({ where: { entity: 'shelter', entity_id: { in: shelterIds } } });
	await prisma.shelters.deleteMany({ where: { id: { in: shelterIds } } });
}

let saved: municipality_shelters[] = [];
const municipalityId = (slug: string) => prisma.municipalities.findUniqueOrThrow({ where: { slug } }).then((m) => m.id);
const assignment = async (slug: string) =>
	prisma.municipality_shelters.findUniqueOrThrow({ where: { municipality_id: await municipalityId(slug) } });

beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	await seedDirectory();
	await removeTestShelters(); // left over by an aborted run
	saved = await Promise.all(TOUCHED.map(assignment));
	const ljubljana = await prisma.shelters.findUniqueOrThrow({ where: { slug: 'zavetisce-ljubljana' } });
	const { id: _id, created_at: _c, updated_at: _u, ...copy } = ljubljana;
	await prisma.shelters.create({
		data: { ...copy, opening_hours: [], slug: INACTIVE, name: 'Test Ađmin Neaktivno', active: false },
	});
}, 60_000);

afterAll(async () => {
	for (const row of saved) {
		await prisma.municipality_shelters.update({ where: { municipality_id: row.municipality_id }, data: row });
		await prisma.directory_changes.deleteMany({
			where: {
				entity: 'municipality_shelter',
				entity_id: String(row.municipality_id),
				version: { gt: row.version },
			},
		});
	}
	await removeTestShelters();
	await prisma.audit_log.deleteMany({ where: { actor_id: { in: ids } } });
	await deleteAuthUsers(ids);
});

const admin = await actor('ADMIN', { aal: 'aal2' });
type Method = 'get' | 'post' | 'put' | 'delete';
const call = (method: Method, path: string, auth = admin.auth) => request(app)[method](path).set('Authorization', auth);

const shelterBody = (over: Record<string, unknown> = {}) => ({
	name: NAME,
	address: 'Testna ulica 1',
	postal_code: '1000',
	city: 'Ljubljana',
	lat: 46.05,
	lng: 14.5,
	phone: '+38612345678',
	phone_display: '01 234 56 78',
	email: 'info@zavetisce.test',
	website: 'https://zavetisce.test/',
	opening_hours: [{ days: 'mon-fri', from: '10:00', to: '16:00' }],
	source: 'TASK-89.1 test',
	verified_at: '2026-10-01',
	municipalities: ['kostel'],
	audit_note: 'new shelter',
	...over,
});
const lastAudit = (action: string) =>
	prisma.audit_log.findFirst({ where: { actor_id: admin.id, action }, orderBy: { created_at: 'desc' } });

describe('guards on every directory admin route', () => {
	const routes: [Method, string][] = [
		['get', '/v1/admin/shelters'],
		['get', '/v1/admin/municipality-shelters'],
		['get', '/v1/admin/shelters/zavetisce-ljubljana/changes'],
		['post', '/v1/admin/shelters'],
		['put', '/v1/admin/shelters/zavetisce-ljubljana'],
		['delete', '/v1/admin/shelters/zavetisce-ljubljana'],
		['put', '/v1/admin/municipality-shelters/kostel'],
		['post', '/v1/admin/directory/import?dry_run=true'],
	];
	const cases = [
		{ who: 'signed-out visitor', role: null, claims: undefined, code: 'UNAUTHENTICATED' },
		{ who: 'anonymous finder', role: null, claims: { is_anonymous: true, aal: 'aal2' }, code: 'UNAUTHENTICATED' },
		{ who: 'user (aal2)', role: 'USER', claims: { aal: 'aal2' }, code: 'FORBIDDEN' },
		{ who: 'shelter member (aal2)', role: 'SHELTER_MEMBER', claims: { aal: 'aal2' }, code: 'FORBIDDEN' },
		{ who: 'moderator (aal2)', role: 'MODERATOR', claims: { aal: 'aal2' }, code: 'FORBIDDEN' },
		{ who: 'moderator without TOTP', role: 'MODERATOR', claims: { aal: 'aal1' }, code: 'AAL2_REQUIRED' },
		{ who: 'admin without TOTP', role: 'ADMIN', claims: { aal: 'aal1' }, code: 'AAL2_REQUIRED' },
	] as const;

	it.each(cases)('$who gets $code, before any validation', async ({ role, claims, code }) => {
		const caller = claims ? await actor(role, claims) : undefined;
		for (const [method, path] of routes) {
			const req = request(app)[method](path);
			if (caller) req.set('Authorization', caller.auth);
			const res = await (method === 'get' ? req : req.send({}));
			expect([path, res.body.error?.code]).toEqual([path, code]);
		}
		expect(await prisma.shelters.findUnique({ where: { slug: 'zavetisce-ljubljana' } })).toMatchObject({
			active: true,
		});
	});
});

describe('admin lists', () => {
	it('GET /shelters lists every shelter by name, inactive ones too, with id, version and confirmed count', async () => {
		const res = await call('get', '/v1/admin/shelters');
		expect(res.status).toBe(200);
		const names = res.body.items.map((s: { name: string }) => s.name);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'sl')));
		const bySlug = (slug: string) => res.body.items.find((s: { slug: string }) => s.slug === slug);
		expect(bySlug('zavetisce-ljubljana')).toMatchObject({
			id: expect.any(String),
			name: 'Zavetišče Ljubljana',
			phone: '+38612560279',
			active: true,
			version: expect.any(Number),
			municipality_count: 13,
			opening_hours: expect.any(Array),
		});
		expect(bySlug(INACTIVE)).toMatchObject({ active: false });
	});

	it('GET /municipality-shelters lists the 212 assignments with the likely shelter of unconfirmed ones', async () => {
		const res = await call('get', '/v1/admin/municipality-shelters');
		expect(res.status).toBe(200);
		expect(res.body.items).toHaveLength(212);
		expect(
			res.body.items.find((m: { municipality: { slug: string } }) => m.municipality.slug === 'beltinci')
		).toEqual({
			municipality: { slug: 'beltinci', name: 'Beltinci' },
			shelter_slug: 'zavetisce-mala-hisa',
			status: 'UNCONFIRMED',
			source: expect.stringMatching(/^ni potrjeno/),
			verified_at: '2026-10-15',
			version: expect.any(Number),
		});
	});
});

describe('POST /v1/admin/directory/import with the seed files', () => {
	it.each(['shelters', 'municipality_shelters'])('a dry run of %s.csv finds nothing to change', async (name) => {
		const res = await call('post', '/v1/admin/directory/import?dry_run=true').send({ csv: seedCsv(name) });
		expect(res.status).toBe(200);
		expect(res.body.errors).toEqual([]);
		expect(res.body.changes).toHaveLength(name === 'shelters' ? 17 : 212);
		expect(res.body.changes.filter((c: { action: string }) => c.action !== 'none')).toEqual([]);
	});
});

describe('shelter create, edit, history and removal', () => {
	let shelterId = '';

	it('POST rejects bad bodies (audit_note, phone, lat without lng, taken slug, unknown municipality)', async () => {
		const bad: [Record<string, unknown>, string][] = [
			[{ audit_note: undefined }, 'audit_note'],
			[{ audit_note: '   ' }, 'audit_note'],
			[{ phone: '01 234 56 78' }, 'phone'],
			[{ lng: undefined }, 'lng'],
			[{ website: 'javascript:alert(1)' }, 'website'],
			[{ slug: 'zavetisce-ljubljana' }, 'slug'],
			[{ municipalities: ['kostel', 'nowhere'] }, 'municipalities.1'],
		];
		for (const [over, path] of bad) {
			const res = await call('post', '/v1/admin/shelters').send(shelterBody(over));
			expect([path, res.status, res.body.error.code]).toEqual([path, 400, 'VALIDATION']);
			expect(res.body.error.issues.map((i: { path: string }) => i.path)).toContain(path);
		}
		expect(await prisma.shelters.count({ where: { slug: SLUG } })).toBe(0);
	});

	it('POST creates the shelter (slug from the name), versioned, audited and public at once', async () => {
		const kostelBefore = await assignment('kostel');
		const res = await call('post', '/v1/admin/shelters').send(shelterBody());
		expect(res.status).toBe(201);
		const { municipalities: _m, audit_note: _a, ...fields } = shelterBody();
		expect(res.body).toEqual({ slug: SLUG, ...fields });

		const shelter = await prisma.shelters.findUniqueOrThrow({ where: { slug: SLUG } });
		shelterId = shelter.id;
		expect(shelter).toMatchObject({ version: 1, active: true, species: ['dog', 'cat'] });
		expect(
			await prisma.directory_changes.findMany({ where: { entity: 'shelter', entity_id: shelter.id } })
		).toEqual([
			expect.objectContaining({
				version: 1,
				actor_id: admin.id,
				audit_note: 'new shelter',
				source: 'TASK-89.1 test',
				data: expect.objectContaining({ slug: SLUG, name: NAME }),
			}),
		]);
		const kostel = await assignment('kostel');
		expect(kostel).toMatchObject({
			shelter_id: shelter.id,
			status: 'CONFIRMED',
			version: kostelBefore.version + 1,
		});
		expect(
			await prisma.directory_changes.findFirst({
				where: {
					entity: 'municipality_shelter',
					entity_id: String(kostel.municipality_id),
					version: kostel.version,
				},
			})
		).toMatchObject({ actor_id: admin.id, audit_note: 'new shelter' });
		expect((await lastAudit('directory.shelter.create'))?.diff).toEqual({
			slug: SLUG,
			municipalities: { added: ['kostel'], removed: [] },
			note: 'new shelter',
		});

		const page = await request(app).get(`/v1/shelters/${SLUG}`);
		expect(page.body).toMatchObject({ name: NAME, municipalities: [{ slug: 'kostel', name: 'Kostel' }] });
		const responsible = await request(app).get('/v1/shelters/responsible?municipality=kostel');
		expect(responsible.body).toMatchObject({ status: 'confirmed', shelter: { slug: SLUG, phone: '+38612345678' } });
	});

	it('PUT replaces the fields with the loaded version; the slug never changes; a stale version is CONFLICT', async () => {
		const body = {
			...shelterBody({ name: 'Test Ađmin Preimenovano', municipalities: ['kostel', 'sodrazica'] }),
			audit_note: 'rename',
			email: null,
			version: 1,
			slug: 'test-admin-other',
		};
		const res = await call('put', `/v1/admin/shelters/${SLUG}`).send(body);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ slug: SLUG, name: 'Test Ađmin Preimenovano' });
		expect(res.body.email).toBeUndefined();
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelterId } })).toMatchObject({
			slug: SLUG,
			version: 2,
			email: null,
		});
		const page = await request(app).get(`/v1/shelters/${SLUG}`);
		expect(page.body.name).toBe('Test Ađmin Preimenovano');
		expect(page.body.municipalities.map((m: { slug: string }) => m.slug)).toEqual(['kostel', 'sodrazica']);
		expect((await lastAudit('directory.shelter.update'))?.diff).toMatchObject({
			name: { from: NAME, to: 'Test Ađmin Preimenovano' },
			email: { from: 'info@zavetisce.test', to: null },
			municipalities: { added: ['sodrazica'], removed: [] },
			note: 'rename',
		});

		const stale = await call('put', `/v1/admin/shelters/${SLUG}`).send(body);
		expect(stale.status).toBe(409);
		expect(stale.body.error).toMatchObject({ code: 'CONFLICT', details: { version: 2 } });
		expect(stale.body.error.details.code).toBeUndefined();
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelterId } })).toMatchObject({ version: 2 });

		const unknown = await call('put', `/v1/admin/shelters/${PREFIX}nope`).send(body);
		expect(unknown.body.error.code).toBe('NOT_FOUND');
	});

	it('PUT without a municipality leaves it UNCONFIRMED without a shelter', async () => {
		const body = { ...shelterBody({ municipalities: ['sodrazica'], audit_note: 'drop kostel' }), version: 2 };
		expect((await call('put', `/v1/admin/shelters/${SLUG}`).send(body)).status).toBe(200);
		expect(await assignment('kostel')).toMatchObject({ shelter_id: null, status: 'UNCONFIRMED' });
		const responsible = await request(app).get('/v1/shelters/responsible?municipality=kostel');
		expect(responsible.body.status).not.toBe('confirmed');
	});

	it('GET /changes returns the versions newest first with the actor and the note', async () => {
		const res = await call('get', `/v1/admin/shelters/${SLUG}/changes`);
		expect(res.status).toBe(200);
		expect(res.body.items.map((c: { version: number }) => c.version)).toEqual([3, 2, 1]);
		expect(res.body.items[0]).toEqual({
			version: 3,
			data: expect.objectContaining({ slug: SLUG, version: 3, name: NAME }),
			source: 'TASK-89.1 test',
			actor_id: admin.id,
			audit_note: 'drop kostel',
			created_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
		});
		expect((await call('get', `/v1/admin/shelters/${PREFIX}nope/changes`)).body.error.code).toBe('NOT_FOUND');
	});

	it('DELETE needs a note and is refused while municipalities are assigned (HAS_ASSIGNMENTS)', async () => {
		const noNote = await call('delete', `/v1/admin/shelters/${SLUG}`).send({});
		expect(noNote.body.error).toMatchObject({ code: 'VALIDATION', issues: [{ path: 'audit_note' }] });
		const res = await call('delete', `/v1/admin/shelters/${SLUG}`).send({ audit_note: 'closed' });
		expect(res.status).toBe(409);
		expect(res.body.error).toMatchObject({ code: 'CONFLICT', details: { code: 'HAS_ASSIGNMENTS', count: 1 } });
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelterId } })).toMatchObject({ active: true });
	});

	it('DELETE deactivates (a new version); the slug stays taken and the seed does not bring it back', async () => {
		const sodrazica = await assignment('sodrazica');
		const reassign = await call('put', '/v1/admin/municipality-shelters/sodrazica').send({
			shelter_slug: null,
			status: 'UNCONFIRMED',
			source: 'ni potrjeno: TASK-89.1 test',
			verified_at: '2026-10-01',
			version: sodrazica.version,
			audit_note: 'before delete',
		});
		expect(reassign.status).toBe(200);
		const res = await call('delete', `/v1/admin/shelters/${SLUG}`).send({ audit_note: 'closed' });
		expect(res.status).toBe(204);
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelterId } })).toMatchObject({
			active: false,
			version: 4,
		});
		expect((await call('get', `/v1/admin/shelters/${SLUG}/changes`)).body.items[0]).toMatchObject({
			version: 4,
			data: { active: false },
			audit_note: 'closed',
		});
		expect((await lastAudit('directory.shelter.deactivate'))?.diff).toEqual({ slug: SLUG, note: 'closed' });
		expect((await request(app).get(`/v1/shelters/${SLUG}`)).status).toBe(404);
		const list = await call('get', '/v1/admin/shelters');
		expect(list.body.items.find((s: { slug: string }) => s.slug === SLUG)).toMatchObject({ active: false });

		const again = await call('post', '/v1/admin/shelters').send(shelterBody({ municipalities: [] }));
		expect(again.body.error.issues).toEqual([{ path: 'slug', message: 'Slug already in use' }]);
		await seedDirectory();
		expect(await prisma.shelters.findUniqueOrThrow({ where: { id: shelterId } })).toMatchObject({ active: false });
		expect(await prisma.shelters.count({ where: { name: NAME } })).toBe(1);
	});
});

describe('PUT /v1/admin/municipality-shelters/:municipality', () => {
	const body = (over: Record<string, unknown> = {}) => ({
		shelter_slug: 'zavetisce-ljubljana',
		status: 'CONFIRMED',
		source: 'TASK-89.1 contract',
		verified_at: '2026-10-02',
		audit_note: 'contract signed',
		...over,
	});

	it('rejects unknown municipalities, stale versions, unknown or inactive shelters', async () => {
		const { version } = await assignment('kostel');
		const path = '/v1/admin/municipality-shelters/kostel';
		expect((await call('put', '/v1/admin/municipality-shelters/nowhere').send(body({ version }))).status).toBe(404);
		const stale = await call('put', path).send(body({ version: version - 1 }));
		expect(stale.body.error).toMatchObject({ code: 'CONFLICT', details: { version } });
		for (const over of [{ shelter_slug: null }, { shelter_slug: `${PREFIX}nope` }, { shelter_slug: INACTIVE }]) {
			const res = await call('put', path).send(body({ ...over, version }));
			expect(res.body.error).toMatchObject({ code: 'VALIDATION', issues: [{ path: 'shelter_slug' }] });
		}
		expect((await call('put', path).send(body({ version, audit_note: '' }))).status).toBe(400);
		expect((await assignment('kostel')).version).toBe(version);
	});

	it('reassigns the municipality: new version, audit entry, public lookup at once', async () => {
		const { version, municipality_id } = await assignment('kostel');
		const res = await call('put', '/v1/admin/municipality-shelters/kostel').send(body({ version }));
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			municipality: { slug: 'kostel', name: 'Kostel' },
			shelter_slug: 'zavetisce-ljubljana',
			status: 'CONFIRMED',
			source: 'TASK-89.1 contract',
			verified_at: '2026-10-02',
			version: version + 1,
		});
		expect(
			await prisma.directory_changes.findFirst({
				where: { entity: 'municipality_shelter', entity_id: String(municipality_id), version: version + 1 },
			})
		).toMatchObject({ actor_id: admin.id, audit_note: 'contract signed', source: 'TASK-89.1 contract' });
		expect((await lastAudit('directory.assignment.update'))?.diff).toMatchObject({
			municipality: 'kostel',
			shelter_slug: { from: null, to: 'zavetisce-ljubljana' },
			status: { from: 'UNCONFIRMED', to: 'CONFIRMED' },
			note: 'contract signed',
		});
		const responsible = await request(app).get('/v1/shelters/responsible?municipality=kostel');
		expect(responsible.body).toMatchObject({ status: 'confirmed', shelter: { slug: 'zavetisce-ljubljana' } });
	});
});

describe('POST /v1/admin/directory/import', () => {
	const IMPORTED = `${PREFIX}import-a`;
	const header = seedCsv('shelters').split('\n')[0]!.trim();
	const line = (slug: string, phone = '+38612345678', display = '01 234 56 78') =>
		`${slug},Test Ađmin Uvoz,Testna 2,1000,Ljubljana,46.05,14.51,${phone},${display},,,"[{""days"":""mon"",""from"":""09:00"",""to"":""12:00""}]",,TASK-89.1 import,2026-10-03,cat`;
	const importAs = (query: string, body: object) => call('post', `/v1/admin/directory/import${query}`).send(body);

	it('a dry run returns the diff (create) and writes nothing; applying needs audit_note', async () => {
		const csv = `${seedCsv('shelters').trimEnd()}\n${line(IMPORTED)}\n`;
		const res = await importAs('?dry_run=true', { csv });
		expect(res.status).toBe(200);
		expect(res.body.errors).toEqual([]);
		expect(res.body.changes).toHaveLength(18);
		expect(res.body.changes.at(-1)).toMatchObject({
			entity: 'shelter',
			id: IMPORTED,
			action: 'create',
			diff: {
				name: { from: null, to: 'Test Ađmin Uvoz' },
				lat: { from: null, to: 46.05 },
				species: { from: null, to: ['cat'] },
				verified_at: { from: null, to: '2026-10-03' },
			},
		});
		expect(await prisma.shelters.count({ where: { slug: IMPORTED } })).toBe(0);
		expect(await lastAudit('directory.import')).toBeNull();

		const noNote = await importAs('', { csv });
		expect(noNote.body.error).toMatchObject({ code: 'VALIDATION', issues: [{ path: 'audit_note' }] });
		expect(await prisma.shelters.count({ where: { slug: IMPORTED } })).toBe(0);
	});

	it('applies the diff in one transaction: versions with the note (no actor), one audit entry', async () => {
		const created = await importAs('', { csv: `${header}\n${line(IMPORTED)}`, audit_note: 'import 1' });
		expect(created.body.changes).toMatchObject([{ id: IMPORTED, action: 'create' }]);
		const shelter = await prisma.shelters.findUniqueOrThrow({ where: { slug: IMPORTED } });
		expect(shelter).toMatchObject({ version: 1, active: true, species: ['cat'], registry_id: null, email: null });

		const updated = await importAs('', {
			csv: `${header}\r\n${line(IMPORTED, '+38619999999', '01 999 99 99')}\r\n`,
			audit_note: 'import 2',
		});
		expect(updated.body).toEqual({
			changes: [
				{
					entity: 'shelter',
					id: IMPORTED,
					action: 'update',
					diff: {
						phone: { from: '+38612345678', to: '+38619999999' },
						phone_display: { from: '01 234 56 78', to: '01 999 99 99' },
					},
				},
			],
			errors: [],
		});
		const changes = await prisma.directory_changes.findMany({
			where: { entity: 'shelter', entity_id: shelter.id },
			orderBy: { version: 'asc' },
		});
		expect(changes.map((c) => [c.version, c.actor_id, c.audit_note])).toEqual([
			[1, null, 'import 1'],
			[2, null, 'import 2'],
		]);
		expect((await lastAudit('directory.import'))?.diff).toEqual({
			rows: 1,
			created: 0,
			updated: 1,
			note: 'import 2',
		});
	});

	it('reports row errors (bad column, duplicate slug, unknown header) and applies nothing then', async () => {
		const other = `${PREFIX}import-b`;
		const script = line(`${PREFIX}import-d`).replace(',,,"[', ',,javascript:alert(1),"[');
		const csv = [header, line(other), line(`${PREFIX}import-c`, '12345'), line(other), script].join('\n');
		const res = await importAs('', { csv, audit_note: 'bad file' });
		expect(res.status).toBe(200);
		expect(res.body.errors).toEqual([
			{ row: 3, field: 'phone' },
			{ row: 4, field: 'slug' },
			{ row: 5, field: 'website' },
		]);
		expect(res.body.changes).toMatchObject([{ id: other, action: 'create' }]);
		expect(await prisma.shelters.count({ where: { slug: other } })).toBe(0);

		const unknown = await importAs('?dry_run=true', { csv: 'foo,bar\n1,2\n' });
		expect(unknown.body).toEqual({ changes: [], errors: [{ row: 1, field: 'header' }] });
	});

	it('the header must match a seed format exactly: extra, missing and misspelled columns fail', async () => {
		const row = line(`${PREFIX}import-h`);
		const mHeader = seedCsv('municipality_shelters').split('\n')[0]!.trim();
		const bad = [
			`${header},extra\n${row},x`,
			`${header.replace(',phone,', ',')}\n${row}`,
			`${header.replace(',phone,', ',phon,')}\n${row}`,
			`${mHeader},extra\nkostel,Kostel,cat,macji-dol,CONFIRMED,,x,2026-10-04,y`,
		];
		for (const csv of bad) {
			const res = await importAs('?dry_run=true', { csv });
			expect(res.body).toEqual({ changes: [], errors: [{ row: 1, field: 'header' }] });
		}
	});

	it('municipality_shelters.csv: rows collapse per municipality like the seed; diffs by shelter slug', async () => {
		const rows = [
			'municipality_slug,municipality_name,species,shelter_slug,status,suggested_shelter,source,verified_at',
			'sodrazica,Sodražica,,zavetisce-ljubljana,CONFIRMED,,TASK-89.1 import,2026-10-04',
			'kostel,Kostel,cat,macji-dol,CONFIRMED,,cats: TASK-89.1,2026-10-04',
			'kostel,Kostel,dog,zavetisce-ljubljana,CONFIRMED,,dogs: TASK-89.1,2026-10-04',
		];
		const bad = [
			'nowhere,Nikjer,,zavetisce-ljubljana,CONFIRMED,,x,2026-10-04',
			`osilnica,Osilnica,,${INACTIVE},CONFIRMED,,x,2026-10-04`,
			'osilnica,Osilnica,,,UNCONFIRMED,no-such-shelter,x,2026-10-04',
			'osilnica,Osilnica,,,MAYBE,,x,2026-10-04',
		];
		const dry = await importAs('?dry_run=true', { csv: [...rows, ...bad].join('\n') });
		expect(dry.body.errors).toEqual([
			{ row: 5, field: 'municipality_slug' },
			{ row: 6, field: 'shelter_slug' },
			{ row: 7, field: 'suggested_shelter' },
			{ row: 8, field: 'status' },
		]);
		expect(dry.body.changes).toEqual([
			{
				entity: 'municipality_shelter',
				id: 'sodrazica',
				action: 'update',
				diff: expect.objectContaining({
					shelter_slug: { from: null, to: 'zavetisce-ljubljana' },
					status: { from: 'UNCONFIRMED', to: 'CONFIRMED' },
				}),
			},
			{
				entity: 'municipality_shelter',
				id: 'kostel',
				action: 'update',
				diff: {
					shelter_slug: { from: 'zavetisce-ljubljana', to: null },
					status: { from: 'CONFIRMED', to: 'UNCONFIRMED' },
					source: { from: 'TASK-89.1 contract', to: 'cat: cats: TASK-89.1; dog: dogs: TASK-89.1' },
					verified_at: { from: '2026-10-02', to: '2026-10-04' },
				},
			},
		]);

		const before = await assignment('sodrazica');
		const applied = await importAs('', { csv: rows.join('\n'), audit_note: 'municipal contracts 2026' });
		expect(applied.body.errors).toEqual([]);
		expect(await assignment('sodrazica')).toMatchObject({ status: 'CONFIRMED', version: before.version + 1 });
		expect(await assignment('kostel')).toMatchObject({ status: 'UNCONFIRMED', shelter_id: null });
		expect(
			await prisma.directory_changes.findFirst({
				where: {
					entity: 'municipality_shelter',
					entity_id: String(before.municipality_id),
					version: before.version + 1,
				},
			})
		).toMatchObject({ actor_id: null, audit_note: 'municipal contracts 2026', source: 'TASK-89.1 import' });
		const responsible = await request(app).get('/v1/shelters/responsible?municipality=sodrazica');
		expect(responsible.body).toMatchObject({ status: 'confirmed', shelter: { slug: 'zavetisce-ljubljana' } });
	});
});
