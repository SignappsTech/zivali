import type { CachedReport } from '@zivali/api/sync';
import type { MapReport } from '@zivali/types';
import {
	areaBBox,
	boostedFirst,
	DEFAULT_FILTERS,
	distanceBand,
	inArea,
	isDefault,
	resetFilters,
	since,
	toMapQuery,
	toggle,
	toSearch,
	withAdSlots,
} from '@/components/browse/filters';

const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };
const NOW = Date.parse('2026-10-16T12:34:56Z');
const report = (id: string, boosted = false) => ({ id, boosted }) as CachedReport;

test('default filters: every type and species (left out of the URL), last 7 days, 10 km around the centre, nearest', () => {
	expect(toSearch(DEFAULT_FILTERS, LJUBLJANA, NOW)).toEqual({
		from: '2026-10-09T12:00:00.000Z',
		near: { ...LJUBLJANA, km: 10 },
		sort: 'distance',
		limit: 20,
	});
	expect(isDefault(DEFAULT_FILTERS)).toBe(true);
});

test('without a centre the list covers Slovenia, newest first, and the map its bounding box', () => {
	expect(toSearch(DEFAULT_FILTERS, null, NOW)).toMatchObject({ sort: 'recent' });
	expect(toSearch(DEFAULT_FILTERS, null, NOW)).not.toHaveProperty('near');
	expect(toMapQuery(DEFAULT_FILTERS, null, NOW).bbox).toEqual([13.38, 45.42, 16.61, 46.88]);
});

test('filters narrow both queries: types, species, colours, size groups, window; closed only on request', () => {
	const filters = {
		...DEFAULT_FILTERS,
		types: ['lost' as const],
		species: ['cat' as const],
		colours: ['black' as const],
		sizes: ['small' as const, 'large' as const],
		when: '24h' as const,
		includeClosed: true,
	};
	const shared = {
		types: ['lost'],
		species: ['cat'],
		colours: ['black'],
		sizes: ['xs', 's', 'l', 'xl'],
		from: '2026-10-15T12:00:00.000Z',
	};
	expect(toSearch(filters, LJUBLJANA, NOW)).toMatchObject({ ...shared, include_closed: true });
	// A pin has no status, so the map stays on open reports.
	expect(toMapQuery(filters, LJUBLJANA, NOW)).toEqual({ ...shared, bbox: areaBBox(LJUBLJANA, 10) });
	expect(isDefault(filters)).toBe(false);
});

test('pills toggle; type and species may go empty (all)', () => {
	expect(toggle(['lost', 'found'], 'found')).toEqual(['lost']);
	expect(toggle(['lost'], 'lost')).toEqual([]);
	expect(isDefault({ ...DEFAULT_FILTERS, types: [], species: [] })).toBe(true);
	expect(toggle(['black'], 'black')).toEqual([]);
	expect(toggle([], 'red')).toEqual(['red']);
});

test('the time window starts on the hour, so the query is the same between renders', () => {
	expect(since('30d', NOW)).toBe(since('30d', NOW + 60_000));
});

test('Reset restores the filters but keeps the place, sort and "show closed"', () => {
	const place = { label: 'Kranj', lat: 46.24, lng: 14.36 };
	const changed = { ...DEFAULT_FILTERS, km: 30, types: [], place, sort: 'recent' as const, includeClosed: true };
	expect(resetFilters(changed)).toEqual({ ...DEFAULT_FILTERS, place, sort: 'recent', includeClosed: true });
});

test('pins outside the radius drop out, so the map and its count match the list', () => {
	const pin = (id: string, lat: number) => ({ id, area: { lat, lng: LJUBLJANA.lng, radius_m: 500 } }) as MapReport;
	const pins = [pin('near', 46.06), pin('edge', 46.14), pin('far', 46.2)];
	expect(inArea(pins, LJUBLJANA, 10).map((p) => p.id)).toEqual(['near', 'edge']);
	expect(inArea(pins, null, 10)).toHaveLength(3);
});

test('distance bands, never a precise distance', () => {
	expect([0.4, 1, 2.9, 3, 9.9, 10, 42].map(distanceBand)).toEqual([
		'lt1',
		'1to3',
		'1to3',
		'3to10',
		'3to10',
		'gt10',
		'gt10',
	]);
});

test('boosted reports come first, otherwise the order stays', () => {
	const ordered = boostedFirst([report('a'), report('b', true), report('c'), report('d', true)]);
	expect(ordered.map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
});

test('ad slots: after every 8 rows, never first, never two in a row; none without a renderer', () => {
	const rows = Array.from({ length: 17 }, (_, i) => report(`r${i + 1}`));
	const items = withAdSlots(rows);
	expect(items.map((item) => (item.kind === 'ad' ? `ad${item.index}` : item.key))).toEqual([
		...rows.slice(0, 8).map((r) => r.id),
		'ad0',
		...rows.slice(8, 16).map((r) => r.id),
		'ad1',
		'r17',
	]);
	expect(withAdSlots(rows.slice(0, 7))).toHaveLength(7);
	expect(withAdSlots(rows, null).every((item) => item.kind === 'report')).toBe(true);
});
