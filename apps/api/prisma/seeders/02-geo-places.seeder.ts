// Seeder 02-geo-places (C6 §Geocoder): GURS settlements, districts and streets (app.geo_places) and house numbers
// (app.geo_addresses) from the gzipped snapshot in supabase/seed/geo/ (scripts/geo-places.mjs, format in LICENSE.md).
// Streams both files with node:zlib and upserts in batches, so every run is idempotent. Runs after 01-geo: places
// reference municipalities. Runs in every environment: static reference data, licence in supabase/seed/geo/LICENSE.md.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';

import { prisma } from '../prisma.ts';

const dir = new URL('../../../../supabase/seed/geo/', import.meta.url);
const PLACES_BATCH = 1000;
const ADDRESSES_BATCH = 10_000;

const lines = (file: string) =>
	createInterface({ input: createReadStream(new URL(file, dir)).pipe(createGunzip()), crlfDelay: Infinity });

// Upserts skip unchanged rows (`where … is distinct from`), so a re-run writes nothing and leaves no dead tuples.
// The snapshot is our own generated file (scripts/geo-places.mjs), so lines go in without parsing in JS.
// One jsonb parameter per batch: the ndjson lines go in as they are (ids stay decimal strings, beyond 2^53).
async function upsertPlaces(batch: string[]): Promise<void> {
	await prisma.$executeRaw`
		insert into app.geo_places
			(id, kind, name, alt_name, search, search_alt, municipality_id, settlement_id, weight, point, geom)
		select r.id::bigint, r.kind, r.name, r.alt_name, r.search, r.search_alt, r.municipality_id,
			r.settlement_id::bigint, r.weight,
			extensions.st_setsrid(extensions.st_makepoint((r.point->>0)::float8, (r.point->>1)::float8), 4326)::extensions.geography,
			extensions.st_setsrid(extensions.st_geomfromgeojson(r.geom), 4326)::extensions.geography
		from jsonb_to_recordset(${`[${batch.join(',')}]`}::jsonb) as r(id text, kind smallint, name text, alt_name text,
			search text, search_alt text, municipality_id smallint, settlement_id text, weight int, point jsonb, geom jsonb)
		on conflict (id) do update set kind = excluded.kind, name = excluded.name, alt_name = excluded.alt_name,
			search = excluded.search, search_alt = excluded.search_alt, municipality_id = excluded.municipality_id,
			settlement_id = excluded.settlement_id, weight = excluded.weight, point = excluded.point, geom = excluded.geom
		where (app.geo_places.*)::text is distinct from (excluded.*)::text`;
}

// One text parameter per batch: the TSV lines (place_id number suffix lng lat), split in SQL (chr(10), chr(9)).
async function upsertAddresses(batch: string[]): Promise<void> {
	await prisma.$executeRaw`
		insert into app.geo_addresses (place_id, number, suffix, point)
		select f[1]::bigint, f[2]::smallint, f[3],
			extensions.st_setsrid(extensions.st_makepoint(f[4]::float8, f[5]::float8), 4326)::extensions.geography
		from unnest(string_to_array(${batch.join('\n')}, chr(10))) as line, string_to_array(line, chr(9)) as f
		on conflict (place_id, number, suffix) do update set point = excluded.point
		where (app.geo_addresses.*)::text is distinct from (excluded.*)::text`;
}

async function* batches(file: string, size: number, header = false): AsyncGenerator<string[]> {
	let batch: string[] = [];
	for await (const line of lines(file)) {
		if (header || !line) {
			header = false;
			continue;
		}
		batch.push(line);
		if (batch.length === size) {
			yield batch;
			batch = [];
		}
	}
	if (batch.length) yield batch;
}

export default async function seedGeoPlaces(): Promise<void> {
	for await (const batch of batches('places.ndjson.gz', PLACES_BATCH)) await upsertPlaces(batch);
	// Trigram GIN indexes filled row by row end up about 5 times their bulk-built size (4.9 MB instead of 0.9 MB).
	await prisma.$executeRaw`reindex table app.geo_places`;
	for await (const batch of batches('addresses.tsv.gz', ADDRESSES_BATCH, true)) await upsertAddresses(batch);
}
