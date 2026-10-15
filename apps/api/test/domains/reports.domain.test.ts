// Reports domain against the local database: short codes and the location privacy rules (C6, ADR-006).
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ShortCode } from '@zivali/validation';

import { GeoDomain } from '../../domains/geo/index.ts';
import { ReportsDomain, type NewReport } from '../../domains/reports/index.ts';
import { userCtx, type Actor } from '../../lib/ctx.ts';
import { prisma } from '../../prisma/prisma.ts';

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
	const rad = Math.PI / 180;
	const h =
		Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
	return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
};

const actor: Actor = {
	user_id: randomUUID(),
	role: 'USER',
	is_anonymous: false,
	aal: 'aal1',
	email_verified: true,
	locale: 'sl',
};
const ctx = () => userCtx(actor);
// Prešernov trg, Ljubljana, with more decimals than a stored point ever has.
const received = { lat: 46.0514263, lng: 14.5060547 };
const lost = (overrides: Partial<NewReport> = {}): NewReport => ({
	type: 'lost',
	species: 'dog',
	name: 'Piki',
	location: received,
	event_at: new Date(),
	chip: '705 0981 0000 0012',
	...overrides,
});
const view = async (code: string) => ReportsDomain.getReport({ code }, ctx());

beforeAll(async () => {
	await prisma.profiles.create({ data: { id: actor.user_id } });
});

afterAll(async () => {
	await prisma.reports.deleteMany({ where: { created_by: actor.user_id } });
	await prisma.profiles.delete({ where: { id: actor.user_id } });
});

describe('newShortCode', () => {
	it('draws 8-character base58 codes without repeats', () => {
		const codes = Array.from({ length: 5000 }, () => ReportsDomain.newShortCode());
		for (const code of codes) expect(ShortCode.safeParse(code).success).toBe(true);
		expect(new Set(codes).size).toBe(codes.length);
	});
});

describe('insertReport', () => {
	it('stores a point 20–30 m from the received one, derives the public circle from it, and keeps the raw value nowhere', async () => {
		const { id, short_code } = await ReportsDomain.insertReport(lost(), ctx());
		expect(ShortCode.safeParse(short_code).success).toBe(true);
		const { report, exact, area, manager_role } = await view(short_code);

		const offset = metres(received, exact);
		expect(offset).toBeGreaterThanOrEqual(19.9);
		expect(offset).toBeLessThanOrEqual(30.1);
		expect(metres(exact, area)).toBeLessThanOrEqual(area.radius_m);
		expect(area.radius_m).toBe(500);
		expect(report).toMatchObject({
			in_slovenia: true,
			municipality: { slug: 'ljubljana' },
			region: { slug: 'osrednjeslovenska' },
			chip_number: '705098100000012',
			chip_status: 'valid',
			created_by: actor.user_id,
		});
		expect(manager_role).toBe('owner');
		// Municipality and region are public, so they come from the circle's centre, not the stored point.
		const geo = await GeoDomain.lookup(area, ctx());
		expect(report).toMatchObject({ municipality_id: geo.municipality_id, region_id: geo.region_id });

		// No column (geography as text included) holds the received coordinates or lies within 19 m of them.
		const [row] = await prisma.$queryRaw<{ dump: string; near: number }[]>`
			with p as (
				select extensions.st_setsrid(extensions.st_makepoint(${received.lng}, ${received.lat}), 4326)::extensions.geography as g
			)
			select (row_to_json(r)::jsonb || jsonb_build_object('exact', extensions.st_astext(r.exact_point),
				'public', extensions.st_astext(r.public_point)))::text as dump,
				least(extensions.st_distance(r.exact_point, p.g), extensions.st_distance(r.public_point, p.g)) as near
			from app.reports r, p
			where r.id = ${id}::uuid`;
		expect(row!.dump).not.toContain(String(received.lat));
		expect(row!.dump).not.toContain(String(received.lng));
		expect(row!.near).toBeGreaterThan(19);
	});

	it('makes the creator the finder of found and sighted reports, with the 150 m circle', async () => {
		const { short_code } = await ReportsDomain.insertReport(lost({ type: 'found', name: null }), ctx());
		const { manager_role, area } = await view(short_code);
		expect(manager_role).toBe('finder');
		expect(area.radius_m).toBe(150);
	});

	it('marks a point outside Slovenia', async () => {
		const vienna = { lat: 48.2082, lng: 16.3738 };
		const { short_code } = await ReportsDomain.insertReport(lost({ location: vienna }), ctx());
		const { report } = await view(short_code);
		expect(report).toMatchObject({ in_slovenia: false, municipality_id: null, region_id: null });
	});

	it('rejects coordinates out of range before any SQL', async () => {
		await expect(ReportsDomain.insertReport(lost({ location: { lat: 46, lng: 374.5 } }), ctx())).rejects.toThrow();
	});
});

describe('location on reads and updates', () => {
	it('returns the same stored point and public circle on every read', async () => {
		const { short_code } = await ReportsDomain.insertReport(lost(), ctx());
		const first = await view(short_code);
		const second = await view(short_code);
		expect(second.exact).toEqual(first.exact);
		expect(second.area).toEqual(first.area);
	});

	it('keeps the stored point on an update without a location or with the stored point sent back', async () => {
		const { id, short_code } = await ReportsDomain.insertReport(lost(), ctx());
		const before = await view(short_code);
		await ReportsDomain.updateReportLocation({ id }, ctx());
		await ReportsDomain.updateReportLocation({ id, location: before.exact }, ctx());
		const after = await view(short_code);
		expect(after.exact).toEqual(before.exact);
		expect(after.area).toEqual(before.area);
	});

	it('coarsens a changed location anew and recomputes the circle for a new radius only', async () => {
		const { id, short_code } = await ReportsDomain.insertReport(lost(), ctx());
		const moved = { lat: 46.5547, lng: 15.6459 }; // Maribor
		await ReportsDomain.updateReportLocation({ id, location: moved }, ctx());
		const afterMove = await view(short_code);
		const offset = metres(moved, afterMove.exact);
		expect(offset).toBeGreaterThanOrEqual(19.9);
		expect(offset).toBeLessThanOrEqual(30.1);
		expect(afterMove.report.municipality?.slug).toBe('maribor');

		await ReportsDomain.updateReportLocation({ id, requested_radius_m: 3000 }, ctx());
		const afterRadius = await view(short_code);
		expect(afterRadius.exact).toEqual(afterMove.exact);
		// Same centre, larger circle: two circles of one stored point never differ in their centre.
		expect({ lat: afterRadius.area.lat, lng: afterRadius.area.lng }).toEqual({
			lat: afterMove.area.lat,
			lng: afterMove.area.lng,
		});
		expect(afterRadius.area.radius_m).toBe(3000);
		expect(afterRadius.report.requested_radius_m).toBe(3000);
		expect(metres(afterRadius.exact, afterRadius.area)).toBeLessThanOrEqual(3000);
	});
});
