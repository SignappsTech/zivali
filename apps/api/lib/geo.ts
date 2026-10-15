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

// Geocoder (C6 §Geocoder) on app.geo_places and app.geo_addresses. Callers validate points with LatLng first.

/** geo_places.kind: 1 settlement, 2 district, 3 street; 0 = the municipality fallback of reverse lookups. */
export type GeoPlaceRow = {
	kind: number;
	name: string;
	/** Streets: their settlement's name. */
	settlement: string | null;
	municipality: string;
	municipality_slug: string;
	lat: number;
	lng: number;
};
export type GeoSearchRow = GeoPlaceRow & { address_lat: number | null; address_lng: number | null };
export type GeoSearchTerms = {
	/** normalisePlace() of the place text: only [a-z0-9 ], so it is safe inside a LIKE pattern. */
	text: string;
	/** normalisePlace() of the part after the first comma (settlement or municipality qualifier). */
	tail: string | null;
	number: number | null;
	suffix: string;
	near?: { lat: number; lng: number };
};

export const GEO_SEARCH_CANDIDATES = 10;

const at = ({ lat, lng }: { lat: number; lng: number }) =>
	Prisma.sql`extensions.st_setsrid(extensions.st_makepoint(${lng}, ${lat}), 4326)::extensions.geography`;

// Candidates: prefix (`like`) or trigram (`%`, pg_trgm.similarity_threshold 0.3) on search or search_alt; GIN indexes.
// Rank: exact, prefix, similarity (it only orders fuzzy candidates: among prefix matches it would favour short
// names, "Ljubno" over "Ljubljana"), tail matches the street's settlement or the municipality, then weight, which
// near turns into weight per km so that same-name streets are told apart by distance, then id.
// The best street or settlement candidate with the house number gets address_lat/address_lng.
export const geoSearchQuery = ({ text, tail, number, suffix, near }: GeoSearchTerms) => {
	const prefix = `${text}%`;
	const tailPrefix = tail && `${tail}%`;
	const weight = near
		? Prisma.sql`(c.weight + 1) / (1 + extensions.st_distance(c.point, ${at(near)}) / 1000)`
		: Prisma.sql`c.weight`;
	return Prisma.sql`
	with matches as (
		select p.id, p.kind, p.name, p.point, p.weight, p.municipality_id, p.settlement_id,
			(p.search = ${text} or coalesce(p.search_alt = ${text}, false)) as exact,
			(p.search like ${prefix} or coalesce(p.search_alt like ${prefix}, false)) as prefix,
			greatest(extensions.similarity(p.search, ${text}), extensions.similarity(p.search_alt, ${text})) as sim
		from app.geo_places p
		where p.search like ${prefix} or p.search_alt like ${prefix}
			or p.search operator(extensions.%) ${text} or p.search_alt operator(extensions.%) ${text}
	), ranked as (
		select c.id, c.kind, c.name, s.name as settlement, m.name_sl as municipality, m.slug as municipality_slug, c.point,
			row_number() over (order by c.exact desc, c.prefix desc, case when c.prefix then 1 else c.sim end desc,
				coalesce(s.search like ${tailPrefix} or s.search_alt like ${tailPrefix}
					or replace(m.slug, '-', ' ') like ${tailPrefix}, false) desc,
				${weight} desc, c.id) as rank
		from matches c
		join app.municipalities m on m.id = c.municipality_id
		left join app.geo_places s on s.id = c.settlement_id
	)
	select r.kind, r.name, r.settlement, r.municipality, r.municipality_slug,
		extensions.st_y(r.point::extensions.geometry) as lat, extensions.st_x(r.point::extensions.geometry) as lng,
		extensions.st_y(a.point::extensions.geometry) as address_lat, extensions.st_x(a.point::extensions.geometry) as address_lng
	from ranked r
	left join app.geo_addresses a on r.kind in (1, 3) and a.place_id = r.id and a.number = ${number}::smallint
		and a.suffix = ${suffix}
	where r.rank <= ${GEO_SEARCH_CANDIDATES}
	order by r.rank`;
};

export async function geoSearch(terms: GeoSearchTerms, tx?: Prisma.TransactionClient): Promise<GeoSearchRow[]> {
	return (tx ?? prisma).$queryRaw<GeoSearchRow[]>(geoSearchQuery(terms));
}

// Reverse: the municipality covering the point (none = outside Slovenia, tie-break as geoLookup), the district, else
// the settlement covering it (with that place's own municipality), else the municipality itself at its point on
// surface (kind 0: simplified settlement polygons leave gaps), rounded like the snapshot (0.00001°). Never a street or
// house number, never the requested point.
export const geoReverseQuery = (lat: number, lng: number) => Prisma.sql`
	select coalesce(p.kind, 0)::int as kind, coalesce(p.name, m.name_sl) as name, null as settlement,
		coalesce(pm.name_sl, m.name_sl) as municipality, coalesce(pm.slug, m.slug) as municipality_slug,
		round(extensions.st_y(x.point)::numeric, 5)::float8 as lat, round(extensions.st_x(x.point)::numeric, 5)::float8 as lng
	from (select id, name_sl, slug, geom from app.municipalities
		where extensions.st_covers(geom, ${at({ lat, lng })}) order by id limit 1) m
	left join lateral (select kind, name, point, municipality_id from app.geo_places
		where geom is not null and extensions.st_covers(geom, ${at({ lat, lng })}) order by kind desc, id limit 1) p on true
	left join app.municipalities pm on pm.id = p.municipality_id
	cross join lateral (select coalesce(p.point::extensions.geometry,
		extensions.st_pointonsurface(m.geom::extensions.geometry)) as point) x`;

export async function geoReverse(lat: number, lng: number, tx?: Prisma.TransactionClient): Promise<GeoPlaceRow | null> {
	const [row] = await (tx ?? prisma).$queryRaw<GeoPlaceRow[]>(geoReverseQuery(lat, lng));
	return row ?? null;
}
