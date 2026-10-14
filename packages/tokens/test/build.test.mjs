// node --test (update snapshots: node --test --test-update-snapshots)
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(here, '..', 'build.mjs');
// Frozen copy of tokens.json v0.2.0, so value edits by the design lead do not break the snapshots.
const FIXTURE = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'tokens.json'), 'utf8'));
const FILES = ['tokens.css', 'web.css', 'native.css', 'tailwind-preset.cjs', 'values.ts', 'map-style.ts'];

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zivali-tokens-'));
fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
after(() => fs.rmSync(root, { recursive: true, force: true }));

let runs = 0;
/** Runs `node build.mjs` on a tokens object (null = docs/design/tokens.json) into a temp dir. */
function build(tokens) {
	const dir = path.join(root, String(runs++));
	const args = [BUILD, '--out', path.join(dir, 'dist')];
	if (tokens) {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, 'tokens.json'), JSON.stringify(tokens));
		args.push('--input', path.join(dir, 'tokens.json'));
	}
	const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
	return { status: r.status, stderr: r.stderr, out: path.join(dir, 'dist') };
}
const mutate = (fn) => {
	const t = structuredClone(FIXTURE);
	fn(t);
	return t;
};
const read = (f) => fs.readFileSync(path.join(fixture.out, f), 'utf8');
const load = (f) => import(pathToFileURL(path.join(fixture.out, f)).href);

const fixture = build(FIXTURE);

test('builds docs/design/tokens.json and writes every C2 output', () => {
	const r = build(null);
	assert.equal(r.status, 0, r.stderr);
	for (const f of FILES) assert.ok(fs.existsSync(path.join(r.out, f)), f);
});

for (const f of ['tokens.css', 'web.css', 'native.css', 'tailwind-preset.cjs']) {
	test(`snapshot ${f}`, (t) => {
		assert.equal(fixture.status, 0, fixture.stderr);
		t.assert.snapshot(read(f), { serializers: [(s) => s] });
	});
}

test('tokens.css has :root, .light and .dark; native.css uses NativeWind selectors and px radius', () => {
	assert.match(read('tokens.css'), /^:root, \.light \{$/m);
	assert.match(read('tokens.css'), /^\.dark \{$/m);
	assert.match(read('native.css'), /^:root \{$/m);
	assert.match(read('native.css'), /^\.dark:root \{$/m);
	assert.match(read('native.css'), /--radius: 16px;/);
});

test('web.css maps every semantic token to --color-<token> inside @theme inline', () => {
	const theme = read('web.css').match(/@theme inline \{\n([\s\S]*?)\n\}/)?.[1] ?? '';
	for (const k of Object.keys(FIXTURE.semantic.light))
		assert.match(theme, new RegExp(`--color-${k}: hsl\\(var\\(--${k}\\)`), k);
	assert.match(theme, /--color-marker-area: hsl\(var\(--marker-area\) \/ var\(--marker-area-alpha\)\);/);
	assert.match(theme, /--radius-lg: var\(--radius\);/);
	assert.match(theme, /--font-display: var\(--font-display\);/);
	assert.match(theme, /--shadow-pop: var\(--shadow-pop\);/);
	assert.match(theme, /--text-base: 1rem;\n\s+--text-base--line-height: 1\.5rem;/);
});

test('tailwind preset nests shadcn pairs and keeps app tokens flat', () => {
	const { darkMode, theme } = createRequire(import.meta.url)(path.join(fixture.out, 'tailwind-preset.cjs'));
	const { colors, minHeight, fontFamily, borderRadius, boxShadow } = theme.extend;
	assert.equal(darkMode, 'class');
	assert.deepEqual(colors.primary, {
		DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
		foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
	});
	for (const k of ['card', 'popover', 'secondary', 'muted', 'accent', 'destructive'])
		assert.deepEqual(Object.keys(colors[k]), ['DEFAULT', 'foreground'], k);
	assert.equal(colors['primary-foreground'], undefined);
	assert.equal(colors.chart['1'], 'hsl(var(--chart-1) / <alpha-value>)');
	assert.equal(colors['status-lost-subtle'], 'hsl(var(--status-lost-subtle) / <alpha-value>)');
	assert.equal(colors['sidebar-primary-foreground'], 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)');
	assert.equal(colors['marker-area'], 'hsl(var(--marker-area) / var(--marker-area-alpha))');
	assert.deepEqual(minHeight, { touch: '44px', comfort: '48px', primary: '56px' });
	assert.deepEqual(fontFamily.display, ['BricolageGrotesque_700Bold']);
	assert.deepEqual(fontFamily['sans-semibold'], ['AtkinsonHyperlegibleNext_600SemiBold']);
	assert.equal(borderRadius.card, 'calc(var(--radius) + 8px)');
	assert.equal(boxShadow.pop, 'var(--shadow-pop)');
});

test('values.ts resolves hex per mode and px sizes', async () => {
	const { colors, radius, component, fonts } = await load('values.ts');
	assert.equal(colors.light.primary, '#145360');
	assert.equal(colors.dark.primary, '#78C0C7');
	assert.equal(colors.light['marker-area'], '#D95A2429');
	assert.deepEqual(Object.keys(colors.dark), Object.keys(FIXTURE.semantic.dark));
	assert.equal(radius.card, 24);
	assert.equal(radius.sheet, 28);
	assert.equal(component.button.lg, 56);
	assert.equal(fonts.native.sans, 'AtkinsonHyperlegibleNext_400Regular');
});

test('a light pair below its minimum fails with pair, ratio and minimum', () => {
	const r = build(
		mutate((t) => {
			t.semantic.light.foreground = 'mist.500';
		})
	);
	assert.equal(r.status, 1);
	assert.match(r.stderr, /light: foreground on background = \d+\.\d\d:1, minimum 7:1/);
});

test('a dark pair below its minimum fails with pair, ratio and minimum', () => {
	const r = build(
		mutate((t) => {
			t.semantic.dark['muted-foreground'] = 'night.500';
		})
	);
	assert.equal(r.status, 1);
	assert.match(r.stderr, /dark: muted-foreground on background = \d+\.\d\d:1, minimum 4\.5:1/);
	assert.doesNotMatch(r.stderr, /light:/);
});

test('a pair pointing at a missing token fails', () => {
	const r = build(
		mutate((t) => {
			t.pairs.list.push(['status-gone', 'card', 3]);
		})
	);
	assert.equal(r.status, 1);
	assert.match(r.stderr, /pairs\.list\[\d+\] status-gone on card \(light\): unknown token "status-gone"/);
});

const shapeCases = [
	[
		'unknown primitive ref',
		(t) => {
			t.semantic.light.primary = 'lagoon.999';
		},
		'semantic.light.primary',
	],
	[
		'missing token in one mode',
		(t) => {
			delete t.semantic.dark.ring;
		},
		'semantic.dark.ring',
	],
	[
		'type size not an object',
		(t) => {
			t.scale.type.size.base = 16;
		},
		'scale.type.size.base',
	],
	[
		'pairs not a list',
		(t) => {
			t.pairs.list = {};
		},
		'pairs.list',
	],
	[
		'pair without ratio',
		(t) => {
			t.pairs.list[0] = ['foreground', 'background'];
		},
		'pairs.list[0]',
	],
	[
		'RN elevation props',
		(t) => {
			t.elevation.reactNative.md = { elevation: 2 };
		},
		'elevation.reactNative.md',
	],
	[
		'unknown component radius',
		(t) => {
			t.shape.card = '3xl';
		},
		'shape.card',
	],
	[
		'missing scale',
		(t) => {
			delete t.scale.zIndex;
		},
		'scale.zIndex',
	],
];
for (const [name, fn, jsonPath] of shapeCases) {
	test(`unexpected shape fails with the JSON path: ${name}`, () => {
		const r = build(mutate(fn));
		assert.equal(r.status, 1);
		assert.match(r.stderr, /unexpected shape/);
		assert.ok(r.stderr.includes(`${jsonPath}: `), r.stderr);
	});
}

test('buildMapStyle: calm positron layer set in the map-* tokens', async () => {
	const { buildMapStyle } = await load('map-style.ts');
	const { colors } = await load('values.ts');
	assert.deepEqual(
		buildMapStyle('light').layers.map((l) => l.id),
		[
			'background',
			'park',
			'water',
			'landuse_residential',
			'landcover_wood',
			'waterway',
			'tunnel_motorway_casing',
			'tunnel_motorway_inner',
			'highway_major_casing',
			'highway_major_inner',
			'highway_major_subtle',
			'highway_motorway_casing',
			'highway_motorway_inner',
			'highway_motorway_subtle',
			'highway_motorway_bridge_casing',
			'highway_motorway_bridge_inner',
			'waterway_line_label',
			'water_name_point_label',
			'water_name_line_label',
			'label_other',
		]
	);
	assert.ok(buildMapStyle('light', { detail: true }).layers.some((l) => l.id === 'highway_minor'));

	for (const mode of ['light', 'dark']) {
		const style = buildMapStyle(mode, { detail: true });
		const c = colors[mode];
		const paint = (id) => style.layers.find((l) => l.id === id).paint;
		assert.equal(style.version, 8);
		assert.equal(style.sources.openmaptiles.url, 'https://tiles.openfreemap.org/planet');
		assert.equal(paint('background')['background-color'], c['map-land']);
		assert.equal(paint('landuse_residential')['fill-color'], c['map-land']);
		assert.equal(paint('park')['fill-color'], c['map-park']);
		assert.equal(paint('landcover_wood')['fill-color'], c['map-park']);
		assert.equal(paint('water')['fill-color'], c['map-water']);
		assert.equal(paint('waterway')['line-color'], c['map-water']);
		for (const id of ['highway_minor', 'highway_major_inner', 'highway_motorway_inner'])
			assert.equal(paint(id)['line-color'], c['map-road'], id);
		for (const id of ['highway_major_casing', 'highway_motorway_casing']) {
			assert.equal(paint(id)['line-color'], c['map-road-casing'], id);
			assert.equal(paint(id)['line-opacity'], 0.6, id);
		}
		for (const id of ['label_other', 'water_name_point_label']) {
			assert.equal(paint(id)['text-color'], c['map-label'], id);
			assert.equal(paint(id)['text-halo-color'], c['map-label-halo'], id);
		}
	}
	assert.notEqual(
		buildMapStyle('light').layers[0].paint['background-color'],
		buildMapStyle('dark').layers[0].paint['background-color']
	);
});
