// Generates the geocoder snapshot (C6 §Geocoder, ADR-007) from four GURS WFS layers:
//   supabase/seed/geo/places.ndjson.gz   settlements, city districts and streets (one JSON object per line)
//   supabase/seed/geo/addresses.tsv.gz   house numbers (place_id, number, suffix, lng, lat)
// Downloads missing layers into <work-dir>, simplifies the polygons there with mapshaper (npx, one-off),
// then writes a deterministic snapshot: rows sorted by id, coordinates rounded to 0.00001°.
// Usage: node scripts/geo-places.mjs <work-dir>
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

import { contains } from './geo-shapes.mjs';

const GEO_DIR = new URL('../supabase/seed/geo/', import.meta.url);
const WFS = {
	rpe: 'https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs',
	kn: 'https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs',
};
const PAGE = 20_000;
const MAPSHAPER = 'npx --yes mapshaper@0.7.70';
export const KIND = { settlement: 1, district: 2, street: 3 };
export const ADDRESS_HEADER = 'place_id\tnumber\tsuffix\tlng\tlat';

// C6: the same expression as normalisePlace in @zivali/validation.
export const normalisePlace = (s) =>
	s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

// Districts lose the "Četrtna skupnost", "Četrt" or "Mestna skupnost" prefix. Names published all in capitals
// or all in lower case ("ČEČOVJE", "JAVORNIK - ŠANCE", "dobja vas") get a capital at the start and after a hyphen.
export const tidyName = (raw, kind) => {
	let name = raw.trim().replace(/\s+/g, ' ');
	if (kind === KIND.district) name = name.replace(/^(Četrtna skupnost|Četrt|Mestna skupnost) /u, '');
	if (name !== name.toUpperCase() && name !== name.toLowerCase()) return name;
	return name.toLowerCase().replace(/(^|-\s*)\p{L}/gu, (m) => m.toUpperCase());
};

const round = (x) => Math.round(x * 1e5) / 1e5;
const byId = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); // decimal ids beyond 2^53
const fail = (what) => {
	throw new Error(what);
};

// The point half way along the longest part of a street (planar length with the cos(lat) correction).
export const pointOnLine = ({ type, coordinates }) => {
	const parts = type === 'LineString' ? [coordinates] : coordinates;
	const k = Math.cos((46 * Math.PI) / 180);
	const seg = (a, b) => Math.hypot((b[0] - a[0]) * k, b[1] - a[1]);
	const length = (line) => line.slice(1).reduce((sum, p, i) => sum + seg(line[i], p), 0);
	const line = parts.reduce((best, part) => (length(part) > length(best) ? part : best));
	let left = length(line) / 2;
	for (let i = 1; i < line.length; i++) {
		const d = seg(line[i - 1], line[i]);
		if (d >= left && d > 0) {
			const t = left / d;
			return [0, 1].map((c) => round(line[i - 1][c] + t * (line[i][c] - line[i - 1][c])));
		}
		left -= d;
	}
	return line[0].map(round);
};

// Inputs are GURS GeoJSON features: settlements and districts already simplified, with inner_x/inner_y
// (mapshaper inner point) in their properties; house numbers as published.
export const buildSnapshot = ({ municipalities, settlements, districts, streets, houseNumbers }) => {
	const municipalityId = new Map(municipalities.map((f) => [f.properties.EID_OBCINA, f.properties.SIFRA]));
	const municipalityOf = (p, what) =>
		municipalityId.get(p.EID_OBCINA) ?? fail(`${what}: unknown municipality ${p.EID_OBCINA}`);

	const count = (key) => {
		const n = new Map();
		for (const { properties: p } of houseNumbers) if (p[key]) n.set(p[key], (n.get(p[key]) ?? 0) + 1);
		return n;
	};
	const perSettlement = count('EID_NASELJE');
	const perStreet = count('EID_ULICA');

	const place = (id, kind, p, extra) => {
		const name = tidyName(p.NAZIV, kind);
		const altName = p.NAZIV_DJ ? tidyName(p.NAZIV_DJ, kind) : null;
		return {
			id,
			kind,
			name,
			alt_name: altName,
			search: normalisePlace(name),
			search_alt: altName && normalisePlace(altName),
			municipality_id: municipalityOf(p, `place ${id}`),
			settlement_id: null,
			...extra,
		};
	};
	const area = (f, id, kind, weight) => {
		const { type, coordinates } = f.geometry ?? fail(`place ${id}: no geometry`);
		if (type !== 'Polygon' && type !== 'MultiPolygon') fail(`place ${id}: unsupported ${type}`);
		return place(id, kind, f.properties, {
			weight,
			point: [round(f.properties.inner_x), round(f.properties.inner_y)],
			geom: { type: 'MultiPolygon', coordinates: type === 'Polygon' ? [coordinates] : coordinates },
		});
	};

	const places = [];
	for (const f of settlements) {
		const id = f.properties.EID_NASELJE;
		places.push(area(f, id, KIND.settlement, perSettlement.get(id) ?? 0));
	}
	const settlementIds = new Set(places.map((p) => p.id));
	for (const f of districts) {
		const id = f.properties.EID_CETRTNA_SKUPNOST;
		const ring = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2);
		const [x0, x1, y0, y1] = [0, 1].flatMap((c) => [
			Math.min(...ring.map((p) => p[c])),
			Math.max(...ring.map((p) => p[c])),
		]);
		const inside = houseNumbers.filter(
			({
				geometry: {
					coordinates: [x, y],
				},
			}) => {
				return x >= x0 && x <= x1 && y >= y0 && y <= y1 && contains(f.geometry, [x, y]);
			}
		).length;
		places.push(area(f, id, KIND.district, inside));
	}
	const dropped = [];
	for (const f of streets) {
		const p = f.properties;
		const id = p.EID_ULICA;
		if (!settlementIds.has(p.EID_NASELJE)) fail(`street ${id}: unknown settlement ${p.EID_NASELJE}`);
		if (!f.geometry) {
			if (perStreet.has(id)) fail(`street ${id}: no geometry but house numbers`);
			dropped.push(`street ${id} ${p.NAZIV}: no geometry, no house numbers`);
			continue;
		}
		places.push(
			place(id, KIND.street, p, {
				settlement_id: p.EID_NASELJE,
				weight: perStreet.get(id) ?? 0,
				point: pointOnLine(f.geometry),
				geom: null,
			})
		);
	}
	places.sort((a, b) => byId(a.id, b.id));
	const placeIds = new Set(places.map((p) => p.id));
	if (placeIds.size !== places.length) fail('duplicate place ids');

	const addresses = houseNumbers.map(({ properties: p, geometry }) => {
		const placeId = p.EID_ULICA ?? p.EID_NASELJE;
		if (!placeIds.has(placeId)) fail(`house number ${p.EID_HISNA_STEVILKA}: unknown place ${placeId}`);
		if (!Number.isInteger(p.HS_STEVILKA) || p.HS_STEVILKA < 1 || p.HS_STEVILKA > 32767) {
			fail(`house number ${p.EID_HISNA_STEVILKA}: number ${p.HS_STEVILKA}`);
		}
		const [lng, lat] = geometry.coordinates;
		return {
			place_id: placeId,
			number: p.HS_STEVILKA,
			suffix: p.HS_DODATEK ?? '',
			lng: round(lng),
			lat: round(lat),
		};
	});
	addresses.sort(
		(a, b) =>
			byId(a.place_id, b.place_id) ||
			a.number - b.number ||
			(a.suffix < b.suffix ? -1 : a.suffix > b.suffix ? 1 : 0)
	);
	for (let i = 1; i < addresses.length; i++) {
		const [a, b] = [addresses[i - 1], addresses[i]];
		if (a.place_id === b.place_id && a.number === b.number && a.suffix === b.suffix) {
			fail(`duplicate address ${a.place_id} ${a.number}${a.suffix}`);
		}
	}
	return { places, addresses, dropped };
};

export const serialise = ({ places, addresses }) => ({
	'places.ndjson': places.map((p) => JSON.stringify(p)).join('\n') + '\n',
	'addresses.tsv':
		[ADDRESS_HEADER, ...addresses.map((a) => [a.place_id, a.number, a.suffix, a.lng, a.lat].join('\t'))].join(
			'\n'
		) + '\n',
});

export const loadSnapshot = () => {
	const read = (name) => gunzipSync(readFileSync(new URL(`${name}.gz`, GEO_DIR))).toString('utf8');
	const places = read('places.ndjson').trimEnd().split('\n').map(JSON.parse);
	const [header, ...rows] = read('addresses.tsv').trimEnd().split('\n');
	if (header !== ADDRESS_HEADER) fail(`addresses.tsv: unexpected header ${header}`);
	const addresses = rows.map((row) => {
		const [place_id, number, suffix, lng, lat] = row.split('\t');
		return { place_id, number: Number(number), suffix, lng: Number(lng), lat: Number(lat) };
	});
	return { places, addresses };
};

const wfs = (service, layer, extra = '') =>
	`${WFS[service]}?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json` +
	`&srsName=EPSG:4326&typeNames=${layer}${extra}`;

const fetchText = async (url) => {
	const res = await fetch(url);
	if (!res.ok) fail(`${res.status} ${res.statusText}: ${url}`);
	return res.text();
};

const download = async (dir) => {
	for (const layer of ['OBCINE', 'NASELJA', 'CETRTNE_SKUPNOSTI', 'ULICE']) {
		const file = join(dir, `${layer}.json`);
		if (!existsSync(file)) writeFileSync(file, await fetchText(wfs('rpe', `SI.GURS.RPE:${layer}`)));
	}
	const pages = [];
	for (let start = 0; ; start += PAGE) {
		const file = join(dir, `HISNE_STEVILKE-${String(start / PAGE).padStart(2, '0')}.json`);
		if (!existsSync(file)) {
			const extra = `&sortBy=FEATUREID&count=${PAGE}&startIndex=${start}`;
			writeFileSync(file, await fetchText(wfs('kn', 'SI.GURS.KN:HISNE_STEVILKE', extra)));
		}
		const page = JSON.parse(readFileSync(file, 'utf8'));
		pages.push(page);
		if (start + page.numberReturned >= page.numberMatched) break;
	}
	return pages;
};

const simplify = (dir, layer) => {
	const [input, output] = [join(dir, `${layer}.json`), join(dir, `${layer}-5.json`)];
	execSync(
		`${MAPSHAPER} -i "${input}" -simplify 5% keep-shapes stats ` +
			`-each "inner_x=this.innerX, inner_y=this.innerY" ` +
			`-o "${output}" format=geojson precision=0.00001 rfc7946`,
		{ stdio: 'inherit' }
	);
	return JSON.parse(readFileSync(output, 'utf8')).features;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const dir = process.argv[2];
	if (!dir) {
		console.error('Usage: node scripts/geo-places.mjs <work-dir>');
		process.exit(2);
	}
	mkdirSync(dir, { recursive: true });
	const pages = await download(dir);
	const features = (layer) => JSON.parse(readFileSync(join(dir, `${layer}.json`), 'utf8')).features;
	const houseNumbers = pages.flatMap((page) => page.features);
	if (houseNumbers.length !== pages[0].numberMatched) fail(`house numbers: ${houseNumbers.length} downloaded`);
	if (new Set(houseNumbers.map((f) => f.properties.EID_HISNA_STEVILKA)).size !== houseNumbers.length) {
		fail('house numbers: paging returned duplicates');
	}
	const snapshot = buildSnapshot({
		municipalities: features('OBCINE'),
		settlements: simplify(dir, 'NASELJA'),
		districts: simplify(dir, 'CETRTNE_SKUPNOSTI'),
		streets: features('ULICE'),
		houseNumbers,
	});
	for (const [name, text] of Object.entries(serialise(snapshot))) {
		writeFileSync(new URL(`${name}.gz`, GEO_DIR), gzipSync(text, { level: 9 }));
	}
	const kinds = Object.entries(KIND).map(([k, v]) => `${snapshot.places.filter((p) => p.kind === v).length} ${k}s`);
	console.log(`Wrote ${snapshot.places.length} places (${kinds.join(', ')}), ${snapshot.addresses.length} addresses`);
	for (const line of snapshot.dropped) console.log(`Dropped ${line}`);
}
