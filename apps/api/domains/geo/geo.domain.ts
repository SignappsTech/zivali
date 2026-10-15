// Geo reference (C6): the municipality, region and in_slovenia flag that reports, ads and stats store with a point.
import type { Ctx } from '../../lib/ctx.ts';
import { geoLookup, type GeoLookup } from '../../lib/geo.ts';
import type { Prisma } from '../../prisma/prisma.ts';

export async function lookup(
	point: { lat: number; lng: number },
	_ctx: Ctx,
	tx?: Prisma.TransactionClient
): Promise<GeoLookup> {
	return geoLookup(point.lat, point.lng, tx);
}

export default { lookup };
