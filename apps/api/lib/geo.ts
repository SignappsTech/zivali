// Point → municipality and region inside Postgres (C6, ADR-006): TypedSQL prisma/sql/geoLookup.sql, GiST on geom.
import { geoLookup as geoLookupSql } from '../generated/sql.ts';
import { prisma, type Prisma } from '../prisma/prisma.ts';

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

export async function geoLookup(lat: number, lng: number, tx?: Prisma.TransactionClient): Promise<GeoLookup> {
	const [row] = await (tx ?? prisma).$queryRawTyped(geoLookupSql(lat, lng));
	return row ? { in_slovenia: true, ...row } : OUTSIDE;
}
