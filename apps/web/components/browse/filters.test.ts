import { describe, expect, it } from 'vitest';

import type { MapReport } from '@zivali/types';

import {
	DEFAULT_FILTERS,
	type Filters,
	filtersSearch,
	inArea,
	isDefault,
	parseFilters,
	resetFilters,
	SLOVENIA,
	toggle,
	toMapQuery,
	toSearch,
	withAdSlots,
} from './filters';

const NOW = Date.parse('2026-10-16T09:41:00Z');
const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };
const parse = (search: string): Filters => ({ ...parseFilters(new URLSearchParams(search)), place: null });

describe('URL filters (AC#3: persist in the URL)', () => {
	it('round-trips every filter, defaults left out, in a fixed order', () => {
		const filters: Filters = {
			...DEFAULT_FILTERS,
			types: ['lost', 'found'],
			species: ['cat'],
			when: '24h',
			km: 5,
			colours: ['black', 'white'],
			sizes: ['small'],
			sort: 'recent',
			includeClosed: true,
		};
		const search = filtersSearch(filters);
		expect(search).toBe(
			'type=lost,found&species=cat&when=24h&km=5&colour=black,white&size=small&sort=recent&closed=1'
		);
		expect(parse(search)).toEqual(filters);
		expect(filtersSearch(DEFAULT_FILTERS)).toBe('');
		expect(parse('')).toEqual(DEFAULT_FILTERS);
	});

	it("reads the header's ?type=lost and ignores unknown values, clamping the distance", () => {
		expect(parse('type=lost').types).toEqual(['lost']);
		const odd = parse(
			'type=lost,dragon,lost&species=horse&when=1y&km=500&colour=plaid&size=huge&sort=x&closed=yes'
		);
		expect(odd).toEqual({ ...DEFAULT_FILTERS, types: ['lost'], km: 50 });
		expect(parse('km=0').km).toBe(1);
		expect(parse('km=abc').km).toBe(10);
	});

	it('never writes a place or a position into the URL (C6)', () => {
		const search = filtersSearch({ ...DEFAULT_FILTERS, place: { label: 'Celje', lat: 46.2309, lng: 15.2604 } });
		expect(search).toBe('');
	});
});

describe('C4 queries', () => {
	it('list and map share the filters; a centre adds near (rounded later by reportQuery) and the sort', () => {
		const filters: Filters = { ...DEFAULT_FILTERS, types: ['lost'], species: ['dog'], sizes: ['small', 'large'] };
		const shared = {
			types: ['lost'],
			species: ['dog'],
			colours: undefined,
			sizes: ['xs', 's', 'l', 'xl'],
			from: '2026-10-09T09:00:00.000Z',
		};
		expect(toSearch(filters, LJUBLJANA, NOW)).toEqual({
			...shared,
			near: { ...LJUBLJANA, km: 10 },
			sort: 'distance',
			limit: 20,
		});
		expect(toMapQuery(filters, LJUBLJANA, NOW)).toEqual({ ...shared, bbox: expect.any(Array) });
	});

	it('without a centre: all of Slovenia, newest first; closed reports only when asked (AC#4)', () => {
		const search = toSearch(DEFAULT_FILTERS, null, NOW);
		expect(search).toMatchObject({ sort: 'recent', types: undefined, species: undefined });
		expect(search).not.toHaveProperty('near');
		expect(search).not.toHaveProperty('include_closed');
		expect(toSearch({ ...DEFAULT_FILTERS, includeClosed: true }, null, NOW).include_closed).toBe(true);
		expect(toMapQuery({ ...DEFAULT_FILTERS, includeClosed: true }, null, NOW)).toEqual({
			types: undefined,
			species: undefined,
			colours: undefined,
			sizes: undefined,
			from: '2026-10-09T09:00:00.000Z',
			bbox: SLOVENIA,
		});
	});

	it('keeps only pins inside the radius, so the map count matches the list', () => {
		const pin = (id: string, lat: number): MapReport => ({
			id,
			short_code: id,
			type: 'lost',
			species: 'dog',
			area: { lat, lng: LJUBLJANA.lng, radius_m: 500 },
			boosted: false,
			thumb_url: null,
		});
		const pins = [pin('near', 46.1), pin('far', 46.2)];
		expect(inArea(pins, LJUBLJANA, 10).map((p) => p.id)).toEqual(['near']);
		expect(inArea(pins, null, 10)).toEqual(pins);
	});
});

describe('filter helpers', () => {
	it('type and species never go empty; reset keeps place, sort and closed', () => {
		expect(toggle(['lost'], 'lost', 1)).toEqual(['lost']);
		expect(toggle(['lost', 'found'], 'lost', 1)).toEqual(['found']);
		const place = { label: 'Celje', lat: 46.2, lng: 15.2 };
		const changed: Filters = { ...DEFAULT_FILTERS, km: 3, place, sort: 'recent', includeClosed: true };
		expect(isDefault(changed)).toBe(false);
		expect(resetFilters(changed)).toEqual({ ...DEFAULT_FILTERS, place, sort: 'recent', includeClosed: true });
		expect(isDefault(resetFilters(changed))).toBe(true);
	});

	it('places an ad slot after every 8 rows, never first and never two in a row (AC#4)', () => {
		const rows = Array.from({ length: 17 }, (_, i) => ({ id: `r${i + 1}` }));
		const items = withAdSlots(rows);
		expect(items.map((item) => item.key).filter((key) => key.startsWith('ad'))).toEqual(['ad-0', 'ad-1']);
		expect(items.findIndex((item) => item.kind === 'ad')).toBe(8);
		expect(items[17]).toMatchObject({ kind: 'ad', index: 1 });
		expect(withAdSlots(rows.slice(0, 7))).toHaveLength(7);
		expect(withAdSlots(rows, null).every((item) => item.kind === 'report')).toBe(true);
	});
});
