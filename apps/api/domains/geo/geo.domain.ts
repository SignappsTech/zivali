// Geo reference (C6): the municipality, region and in_slovenia flag that reports, ads and stats store with a point.
import { LatLng } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';
import { geoLookup, type GeoLookup } from '../../lib/geo.ts';
import type { Prisma } from '../../prisma/prisma.ts';

export async function lookup(
	point: { lat: number; lng: number },
	_ctx: Ctx,
	tx?: Prisma.TransactionClient
): Promise<GeoLookup> {
	// PostGIS wraps an out-of-range lng (374.5 becomes 14.5), so reject it first.
	const { lat, lng } = LatLng.parse(point);
	return geoLookup(lat, lng, tx);
}

export default { lookup };
