// TASK-15.7: geocoder snapshot (GURS settlements, districts, streets, house numbers). Run: node --test scripts/
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { gunzipSync } from 'node:zlib';

import {
	ADDRESS_HEADER,
	buildSnapshot,
	KIND,
	loadSnapshot,
	normalisePlace,
	serialise,
	tidyName,
} from './geo-places.mjs';
import { contains, polygonProblem } from './geo-shapes.mjs';
import { loadFeatures } from './geo-to-sql.mjs';

const geoFile = (name) => new URL(`../supabase/seed/geo/${name}`, import.meta.url);
const { places, addresses } = loadSnapshot();
const placeById = new Map(places.map((p) => [p.id, p]));
const municipalities = loadFeatures('municipalities');
const metres = ([x1, y1], [x2, y2]) =>
	Math.hypot((x2 - x1) * 111_320 * Math.cos((46 * Math.PI) / 180), (y2 - y1) * 110_574);
const inSlovenia = ([lng, lat]) => lng > 13.3 && lng < 16.7 && lat > 45.4 && lat < 46.9;

test('snapshot files total at most 8 MB', () => {
	const bytes = statSync(geoFile('places.ndjson.gz')).size + statSync(geoFile('addresses.tsv.gz')).size;
	assert.ok(bytes <= 8_000_000, `${bytes} bytes`);
});

test('counts match the numbers recorded in LICENSE.md', () => {
	const licence = readFileSync(geoFile('LICENSE.md'), 'utf8');
	const recorded = (layer) => {
		const m = licence.match(new RegExp(`\\| \`SI\\.GURS\\.[A-Z]+:${layer}\` \\| [\\d,]+ \\| ([\\d,]+) `));
		assert.ok(m, `${layer} row in LICENSE.md`);
		return Number(m[1].replaceAll(',', ''));
	};
	const ofKind = (kind) => places.filter((p) => p.kind === kind).length;
	assert.equal(ofKind(KIND.settlement), recorded('NASELJA'));
	assert.equal(ofKind(KIND.district), recorded('CETRTNE_SKUPNOSTI'));
	assert.equal(ofKind(KIND.street), recorded('ULICE'));
	assert.equal(addresses.length, recorded('HISNE_STEVILKE'));
	assert.equal(places.length, recorded('NASELJA') + recorded('CETRTNE_SKUPNOSTI') + recorded('ULICE'));
});

test('ids and address keys are unique; fields have the C6 shape', () => {
	assert.equal(placeById.size, places.length, 'unique place ids');
	assert.equal(new Set(addresses.map((a) => `${a.place_id} ${a.number}${a.suffix}`)).size, addresses.length);
	for (const p of places) {
		assert.match(p.id, /^\d{1,19}$/, `id ${p.id}`);
		assert.ok(Object.values(KIND).includes(p.kind), `kind of ${p.id}`);
		assert.ok(p.name && p.name === p.name.trim(), `name of ${p.id}`);
		assert.doesNotMatch(p.name, /^(Četrtna skupnost|Četrt|Mestna skupnost) /, `district prefix in ${p.name}`);
		assert.ok(p.name !== p.name.toUpperCase() && p.name !== p.name.toLowerCase(), `case of ${p.name}`);
		assert.ok(Number.isInteger(p.weight) && p.weight >= 0, `weight of ${p.id}`);
		assert.ok(inSlovenia(p.point), `point of ${p.id}`);
		assert.equal(p.geom === null, p.kind === KIND.street, `geom of ${p.id}`);
		assert.equal(p.settlement_id === null, p.kind !== KIND.street, `settlement of ${p.id}`);
	}
	for (const a of addresses) {
		assert.ok(Number.isInteger(a.number) && a.number >= 1 && a.number <= 32767, `${a.place_id} ${a.number}`);
		assert.match(a.suffix, /^\p{Ll}?$/u);
	}
});

test('settlement and district polygons are valid and contain their point', () => {
	for (const p of places.filter((x) => x.geom)) {
		assert.equal(p.geom.type, 'MultiPolygon');
		for (const polygon of p.geom.coordinates) {
			assert.equal(polygonProblem(polygon), null, `${p.id} ${p.name}`);
			assert.ok(polygon.flat().every(inSlovenia), `${p.id} ${p.name} in Slovenia`);
		}
		assert.ok(contains(p.geom, p.point), `point of ${p.id} ${p.name}`);
	}
});

test('every street and address links to an existing place and municipality', () => {
	const municipalityIds = new Set(municipalities.map((f) => f.properties.id));
	for (const p of places) {
		assert.ok(municipalityIds.has(p.municipality_id), `municipality ${p.municipality_id} of ${p.id}`);
		if (p.kind !== KIND.street) continue;
		const settlement = placeById.get(p.settlement_id);
		assert.equal(settlement?.kind, KIND.settlement, `settlement of street ${p.id}`);
		assert.equal(settlement.municipality_id, p.municipality_id, `municipality of street ${p.id}`);
	}
	for (const a of addresses) {
		const kind = placeById.get(a.place_id)?.kind;
		assert.ok(kind === KIND.street || kind === KIND.settlement, `place ${a.place_id}`);
	}
});

test('normalisePlace is the C6 expression and fills search and search_alt', () => {
	const c6 = (s) =>
		s
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	for (const s of ['Šentvid', 'sentvid', 'SENTVID', ' Šentvid ']) assert.equal(normalisePlace(s), 'sentvid');
	assert.equal(normalisePlace('Cesta 24. junija'), 'cesta 24 junija');
	assert.equal(normalisePlace('Velenje - levi breg - vzhod'), 'velenje levi breg vzhod');
	for (const p of places) {
		assert.equal(p.search, c6(p.name), p.name);
		assert.equal(p.search_alt, p.alt_name === null ? null : c6(p.alt_name), p.name);
	}
	assert.equal(places.filter((p) => p.alt_name).length, 685, 'official Italian and Hungarian names (ADR-007)');
});

test('Trubarjeva cesta 5 in Ljubljana, the district Šiška and Vrhpolje pri Kamniku 5 resolve to the expected points', () => {
	const ljubljana = municipalities.find((f) => f.properties.slug === 'ljubljana');
	const find = (kind, search, extra = () => true) => {
		const hits = places.filter((p) => p.kind === kind && p.search === search && extra(p));
		assert.equal(hits.length, 1, `${search}: ${hits.length} hits`);
		return hits[0];
	};
	const address = (placeId, number, suffix = '') => {
		const a = addresses.find((x) => x.place_id === placeId && x.number === number && x.suffix === suffix);
		assert.ok(a, `${placeId} ${number}${suffix}`);
		return [a.lng, a.lat];
	};

	const city = find(KIND.settlement, 'ljubljana', (p) => p.municipality_id === 61);
	assert.ok(city.weight > 30_000, 'Ljubljana is the heaviest place');
	const street = find(KIND.street, 'trubarjeva cesta', (p) => p.settlement_id === city.id);
	assert.ok(contains(city.geom, street.point), 'street point inside the settlement');
	const house = address(street.id, 5);
	assert.ok(metres(house, [14.50704912, 46.05197502]) < 2, `Trubarjeva cesta 5 at ${house}`);
	assert.ok(contains(ljubljana.geometry, house));

	const siska = find(KIND.district, 'siska');
	assert.equal(siska.name, 'Šiška');
	assert.equal(siska.municipality_id, 61);
	assert.ok(metres(siska.point, [14.48378, 46.06911]) < 50, `Šiška at ${siska.point}`);
	assert.ok(contains(ljubljana.geometry, siska.point) && contains(city.geom, siska.point));

	const village = find(KIND.settlement, 'vrhpolje pri kamniku');
	assert.equal(village.municipality_id, 43, 'Kamnik');
	assert.ok(!places.some((p) => p.settlement_id === village.id), 'no streets');
	const farm = address(village.id, 5);
	assert.ok(metres(farm, [14.62270377, 46.22878293]) < 2, `Vrhpolje pri Kamniku 5 at ${farm}`);
	assert.ok(contains(village.geom, farm));
});

test('the committed snapshot is in canonical form', () => {
	const files = serialise({ places, addresses });
	for (const [name, text] of Object.entries(files)) {
		assert.equal(gunzipSync(readFileSync(geoFile(`${name}.gz`))).toString('utf8'), text, name);
	}
	assert.ok(files['addresses.tsv'].startsWith(`${ADDRESS_HEADER}\n`));
});

test('names are tidied: district prefixes stripped, all-caps and lower-case names capitalised', () => {
	const cases = [
		['Četrtna skupnost Šiška', 'Šiška'],
		['Četrt Jezero', 'Jezero'],
		['Mestna skupnost Litija', 'Litija'],
		['ČEČOVJE', 'Čečovje'],
		['JAVORNIK - ŠANCE', 'Javornik - Šance'],
		['dobja vas', 'Dobja vas'],
		['Velenje - levi breg - vzhod', 'Velenje - levi breg - vzhod'],
		['Brezje-Dogoše-Zrkovci', 'Brezje-Dogoše-Zrkovci'],
	];
	for (const [raw, name] of cases) assert.equal(tidyName(raw, KIND.district), name);
	assert.equal(tidyName('Četrt Jezero', KIND.street), 'Četrt Jezero', 'prefixes only on districts');
});

test('the generator is deterministic, joins places and house numbers and rejects broken links', () => {
	const square = (x, y, d) => ({
		type: 'Polygon',
		coordinates: [
			[
				[x, y],
				[x + d, y],
				[x + d, y + d],
				[x, y + d],
				[x, y],
			],
		],
	});
	const S = '110300000000000001';
	const D = '110700000000000002';
	const U = '110400000000000003';
	const hn = (id, street, number, suffix, coordinates) => ({
		geometry: { type: 'Point', coordinates },
		properties: {
			EID_HISNA_STEVILKA: id,
			EID_NASELJE: S,
			EID_ULICA: street,
			HS_STEVILKA: number,
			HS_DODATEK: suffix,
		},
	});
	const input = {
		municipalities: [{ properties: { EID_OBCINA: 'm61', SIFRA: 61 } }],
		settlements: [
			{
				geometry: square(14.4, 46.0, 0.2),
				properties: {
					EID_NASELJE: S,
					NAZIV: 'Ljubljana',
					NAZIV_DJ: null,
					EID_OBCINA: 'm61',
					inner_x: 14.5,
					inner_y: 46.1,
				},
			},
		],
		districts: [
			{
				geometry: square(14.45, 46.05, 0.05),
				properties: {
					EID_CETRTNA_SKUPNOST: D,
					NAZIV: 'Četrtna skupnost Šiška',
					NAZIV_DJ: null,
					EID_OBCINA: 'm61',
					inner_x: 14.475,
					inner_y: 46.075,
				},
			},
		],
		streets: [
			{
				geometry: {
					type: 'MultiLineString',
					coordinates: [
						[
							[14.46, 46.06],
							[14.461, 46.06],
						],
						[
							[14.46, 46.07],
							[14.48, 46.07],
						],
					],
				},
				properties: {
					EID_ULICA: U,
					NAZIV: 'Trubarjeva cesta',
					NAZIV_DJ: null,
					EID_OBCINA: 'm61',
					EID_NASELJE: S,
				},
			},
			{
				geometry: null,
				properties: { EID_ULICA: '110400000000000009', NAZIV: 'Ravne', EID_OBCINA: 'm61', EID_NASELJE: S },
			},
		],
		houseNumbers: [
			hn('h1', U, 5, null, [14.470004, 46.070004]),
			hn('h2', null, 12, 'a', [14.55, 46.15]),
			hn('h3', U, 5, 'a', [14.47, 46.07]),
		],
	};
	const snapshot = buildSnapshot(input);
	const reversed = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, [...v].reverse()]));
	assert.deepEqual(serialise(buildSnapshot(reversed)), serialise(snapshot));
	assert.deepEqual(
		snapshot.places.map((p) => [
			p.id,
			p.kind,
			p.name,
			p.search,
			p.municipality_id,
			p.settlement_id,
			p.weight,
			p.point,
		]),
		[
			[S, KIND.settlement, 'Ljubljana', 'ljubljana', 61, null, 3, [14.5, 46.1]],
			[U, KIND.street, 'Trubarjeva cesta', 'trubarjeva cesta', 61, S, 2, [14.47, 46.07]],
			[D, KIND.district, 'Šiška', 'siska', 61, null, 2, [14.475, 46.075]],
		]
	);
	assert.equal(snapshot.places[0].geom.type, 'MultiPolygon');
	assert.equal(snapshot.dropped.length, 1);
	assert.equal(
		serialise(snapshot)['addresses.tsv'],
		`${ADDRESS_HEADER}\n${S}\t12\ta\t14.55\t46.15\n${U}\t5\t\t14.47\t46.07\n${U}\t5\ta\t14.47\t46.07\n`
	);
	const broken = { ...input, houseNumbers: [hn('h4', '110400000000000404', 1, null, [14.5, 46.1])] };
	assert.throws(() => buildSnapshot(broken), /unknown place/);
	assert.throws(
		() => buildSnapshot({ ...input, houseNumbers: [...input.houseNumbers, input.houseNumbers[0]] }),
		/duplicate/
	);
});
