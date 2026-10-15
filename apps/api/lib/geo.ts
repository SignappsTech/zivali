// Point → municipality and region inside Postgres (C6, ADR-006): one raw query, GiST index on geom.
import { Prisma } from '../generated/client.ts';
import { prisma } from '../prisma/prisma.ts';

export type GeoLookup =
	| { in_slovenia: true; municipality_id: number; municipality_slug: string; region_id: number; region_slug: string }
	| { in_slovenia: false; municipality_id: null; municipality_slug: null; region_id: null; region_slug: null };

const OUTSIDE: GeoLookup = {
	in_slovenia: false,
	municipality_id: null,
	municipality_slug: null,
	region_id: null,
	region_slug: null,
};

type Row = { municipality_id: number; municipality_slug: string; region_id: number; region_slug: string };

// Functions are schema-qualified: `?schema=app` leaves `extensions` off the search path.
// st_makepoint(x = lng, y = lat). st_covers = inside or on the border.
// Tie-break `order by m.id`: the GURS polygons of Ivančna Gorica and Žužemberk overlap by about 330 m².
// No row means the point is outside Slovenia.
export const geoLookupQuery = (lat: number, lng: number) => Prisma.sql`
	select m.id as municipality_id, m.slug as municipality_slug, r.id as region_id, r.slug as region_slug
	from app.municipalities m join app.regions r on r.id = m.region_id
	where extensions.st_covers(m.geom, extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography)
	order by m.id limit 1`;

export async function geoLookup(lat: number, lng: number, tx?: Prisma.TransactionClient): Promise<GeoLookup> {
	const [row] = await (tx ?? prisma).$queryRaw<Row[]>(geoLookupQuery(lat, lng));
	return row ? { in_slovenia: true, ...row } : OUTSIDE;
}
