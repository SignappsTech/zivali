// TASK-6.1: GURS geo reference data and the SQL generator. Run: node --test scripts/
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import test from 'node:test';
import { geoToSql, loadFeatures } from './geo-to-sql.mjs';

const regions = loadFeatures('regions');
const municipalities = loadFeatures('municipalities');
const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

// Even-odd ray casting over all rings, so holes count as outside.
const contains = (feature, [lng, lat]) => {
  let inside = false;
  for (const ring of polygonsOf(feature.geometry).flat()) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
  }
  return inside;
};

const orient = (p, q, r) =>
  Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
const within = (p, q, r) =>
  Math.min(p[0], r[0]) <= q[0] &&
  q[0] <= Math.max(p[0], r[0]) &&
  Math.min(p[1], r[1]) <= q[1] &&
  q[1] <= Math.max(p[1], r[1]);
const segmentsTouch = (a, b, c, d) => {
  const [o1, o2, o3, o4] = [orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)];
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && within(a, c, b)) ||
    (o2 === 0 && within(a, d, b)) ||
    (o3 === 0 && within(c, a, d)) ||
    (o4 === 0 && within(c, b, d))
  );
};

// Problems that make a polygon invalid in PostGIS: open or short rings, repeated points,
// rings that cross or touch themselves or each other. Sweep over segments sorted by min x.
const polygonProblem = (polygon) => {
  const segments = [];
  for (const [r, ring] of polygon.entries()) {
    if (ring.length < 4) return `ring ${r} has ${ring.length} positions`;
    if (ring[0].join() !== ring.at(-1).join()) return `ring ${r} is not closed`;
    for (let i = 0; i < ring.length - 1; i++) {
      const [a, b] = [ring[i], ring[i + 1]];
      if (!a.every(Number.isFinite)) return `ring ${r} has a non-numeric position`;
      if (a.join() === b.join()) return `ring ${r} repeats position ${i}`;
      segments.push({
        r,
        i,
        last: ring.length - 2,
        a,
        b,
        minX: Math.min(a[0], b[0]),
        maxX: Math.max(a[0], b[0]),
      });
    }
  }
  segments.sort((s, t) => s.minX - t.minX);
  for (let x = 0; x < segments.length; x++) {
    const s = segments[x];
    for (let y = x + 1; y < segments.length && segments[y].minX <= s.maxX; y++) {
      const t = segments[y];
      const gap = Math.abs(s.i - t.i);
      if (s.r === t.r && (gap === 1 || gap === s.last)) continue; // neighbours share a vertex
      if (segmentsTouch(s.a, s.b, t.a, t.b))
        return `ring ${s.r} segment ${s.i} meets ring ${t.r} segment ${t.i}`;
    }
  }
  return null;
};

test('12 statistical regions and 212 municipalities in at most 2 MB of GeoJSON', () => {
  assert.equal(regions.length, 12);
  assert.equal(municipalities.length, 212);
  const bytes = ['regions', 'municipalities']
    .map((name) => statSync(new URL(`../supabase/seed/geo/${name}.geojson`, import.meta.url)).size)
    .reduce((a, b) => a + b);
  assert.ok(bytes <= 2_000_000, `${bytes} bytes`);
});

test('ids and ASCII lower-case slugs are unique, names are set, every municipality has a region', () => {
  for (const features of [regions, municipalities]) {
    const props = features.map((f) => f.properties);
    assert.equal(new Set(props.map((p) => p.id)).size, props.length, 'unique ids');
    assert.equal(new Set(props.map((p) => p.slug)).size, props.length, 'unique slugs');
    for (const p of props) {
      assert.ok(Number.isInteger(p.id), `id ${p.id}`);
      assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(p.name_sl && p.name_en, `names of ${p.slug}`);
    }
  }
  const regionIds = new Set(regions.map((f) => f.properties.id));
  const used = new Set(municipalities.map((f) => f.properties.region_id));
  for (const id of used) assert.ok(regionIds.has(id), `region ${id} exists`);
  assert.equal(used.size, 12, 'every region has municipalities');
});

test('polygons are valid WGS84 polygons inside the Slovenia bounding box', () => {
  const bowtie = [
    [0, 0],
    [1, 1],
    [1, 0],
    [0, 1],
    [0, 0],
  ];
  assert.notEqual(polygonProblem([bowtie]), null, 'the check catches a self-intersection');
  for (const f of [...regions, ...municipalities]) {
    assert.ok(['Polygon', 'MultiPolygon'].includes(f.geometry.type), f.properties.slug);
    for (const polygon of polygonsOf(f.geometry)) {
      assert.equal(polygonProblem(polygon), null, f.properties.slug);
      for (const [lng, lat] of polygon.flat()) {
        assert.ok(
          lng > 13.3 && lng < 16.7 && lat > 45.4 && lat < 46.9,
          `${f.properties.slug} ${lng},${lat}`,
        );
      }
    }
  }
});

test('city centres fall in exactly one municipality and the right region', () => {
  const cases = [
    { point: [14.5061, 46.0514], municipality: 'ljubljana', region: 'osrednjeslovenska' },
    { point: [15.6456, 46.5576], municipality: 'maribor', region: 'podravska' },
    { point: [13.7302, 45.5481], municipality: 'koper', region: 'obalno-kraska' },
  ];
  for (const { point, municipality, region } of cases) {
    const hits = municipalities.filter((f) => contains(f, point));
    assert.deepEqual(
      hits.map((f) => f.properties.slug),
      [municipality],
    );
    const regionHits = regions.filter((f) => contains(f, point));
    assert.deepEqual(
      regionHits.map((f) => f.properties.slug),
      [region],
    );
    assert.equal(hits[0].properties.region_id, regionHits[0].properties.id);
  }
});

test('the generator is deterministic and emits one row per feature, regions first', () => {
  const sql = geoToSql(regions, municipalities);
  assert.equal(geoToSql([...regions].reverse(), [...municipalities].reverse()), sql);
  assert.equal(sql.match(/^ {2}\(/gm).length, 224);
  assert.ok(
    sql.indexOf('insert into public.regions') < sql.indexOf('insert into public.municipalities'),
  );
  assert.match(
    sql,
    /\(61, 'ljubljana', 'Ljubljana', 'Ljubljana', 8, 'SRID=4326;MULTIPOLYGON\(\(\(/,
  );
  assert.throws(() =>
    geoToSql([{ ...regions[0], properties: { ...regions[0].properties, slug: 'Bad' } }], []),
  );
});
