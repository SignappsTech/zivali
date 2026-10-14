#!/usr/bin/env node
// @zivali/tokens generator (contract C2, ADR-002). Zero dependencies, Node 22.
//
//   node build.mjs                                reads docs/design/tokens.json, writes dist/
//   node build.mjs --input <file> --out <dir>     same for another tokens file (tests)
//
// Validates the tokens.json shape, then every pair in pairs.list in light and dark, and exits 1 with
// the offending JSON path or pair. Colour maths and HSL output follow docs/design/build-tokens.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: { input: { type: 'string' }, out: { type: 'string' } },
});
const input = path.resolve(args.input ?? path.join(here, '../../docs/design/tokens.json'));
const outDir = path.resolve(args.out ?? path.join(here, 'dist'));

const MODES = ['light', 'dark'];
// shadcn / React Native Reusables base names (C2: always present)
const BASE = [
  'background',
  'foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
];
const PAIRED = ['card', 'popover', 'primary', 'secondary', 'muted', 'accent', 'destructive']; // nested in the preset
const WEIGHT_NAMES = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' }; // @expo-google-fonts suffixes
const RN_SHADOW = ['elevation', 'shadowOpacity', 'shadowRadius', 'shadowOffsetY'];

// Calm map (design system §9): positron layers kept, with the token per paint property. Everything else is dropped.
const ROAD = { 'line-color': 'map-road' };
const CASING = { 'line-color': 'map-road-casing', 'line-opacity': 0.6 };
const LABEL = { 'text-color': 'map-label', 'text-halo-color': 'map-label-halo' };
const MAP_LAYERS = {
  background: { 'background-color': 'map-land' },
  park: { 'fill-color': 'map-park', 'fill-opacity': 1 },
  water: { 'fill-color': 'map-water' },
  landuse_residential: { 'fill-color': 'map-land' },
  landcover_wood: { 'fill-color': 'map-park', 'fill-opacity': 0.7 },
  waterway: { 'line-color': 'map-water' },
  tunnel_motorway_casing: CASING,
  tunnel_motorway_inner: ROAD,
  highway_minor: ROAD, // detail maps only (removed by buildMapStyle unless detail: true)
  highway_major_casing: CASING,
  highway_major_inner: ROAD,
  highway_major_subtle: ROAD,
  highway_motorway_casing: CASING,
  highway_motorway_inner: ROAD,
  highway_motorway_subtle: ROAD,
  highway_motorway_bridge_casing: CASING,
  highway_motorway_bridge_inner: ROAD,
  waterway_line_label: LABEL,
  water_name_point_label: LABEL,
  water_name_line_label: LABEL,
  label_other: LABEL, // area names (suburbs); city, street, shield and boundary labels are dropped
};
const MAP_TOKENS = [
  ...new Set(
    Object.values(MAP_LAYERS)
      .flatMap((p) => Object.values(p))
      .filter((v) => typeof v === 'string'),
  ),
];

// ---------- helpers ----------
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const HEX = /^#[0-9a-f]{6}$/i;
const PX = /^(\d+(?:\.\d+)?)px$/;
const LENGTH = /^(\d+(?:\.\d+)?)(px|rem)$/;
const RADIUS = /^radius(?:\s*([+-])\s*(\d+(?:\.\d+)?)px)?$/;
const entries = (o) => Object.entries(isObj(o) ? o : {}).filter(([k]) => k !== 'note');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Cannot read ${file}: ${e.message}`, { cause: e });
  }
}

// ---------- shape ----------
function validate(T) {
  const errors = [];
  const fail = (p, msg, v) =>
    errors.push(`${p}: ${msg}${v === undefined ? '' : `, got ${JSON.stringify(v)}`}`);
  const get = (p) => p.split('.').reduce((o, k) => (isObj(o) ? o[k] : undefined), T);
  const obj = (p) => {
    const v = get(p);
    if (isObj(v)) return v;
    fail(p, 'expected an object', v);
    return {};
  };
  const each = (p, ok, what) => {
    for (const [k, v] of entries(obj(p))) if (!ok(v)) fail(`${p}.${k}`, `expected ${what}`, v);
  };
  const sameKeys = (p) => {
    const [a, b] = MODES.map((m) => Object.keys(obj(`${p}.${m}`)));
    for (const k of a) if (!b.includes(k)) fail(`${p}.dark.${k}`, 'missing (defined in light)');
    for (const k of b) if (!a.includes(k)) fail(`${p}.light.${k}`, 'missing (defined in dark)');
  };

  for (const [scale] of entries(obj('primitives.color')))
    each(`primitives.color.${scale}`, (v) => HEX.test(v), '"#RRGGBB"');
  for (const k of ['display', 'sans'])
    if (!isStr(get(`primitives.fontFamily.${k}`)))
      fail(
        `primitives.fontFamily.${k}`,
        'expected a CSS font stack',
        get(`primitives.fontFamily.${k}`),
      );

  const isRef = (r) =>
    typeof r === 'string' && (r.startsWith('#') ? HEX.test(r) : HEX.test(primitive(T, r) ?? ''));
  const isColour = (v) =>
    isObj(v) ? isRef(v.ref) && isNum(v.alpha) && v.alpha >= 0 && v.alpha <= 1 : isRef(v);
  for (const m of MODES) {
    each(
      `semantic.${m}`,
      isColour,
      'a known "scale.step", "#RRGGBB" or { "ref": "scale.step", "alpha": 0..1 }',
    );
    const sem = isObj(get(`semantic.${m}`)) ? get(`semantic.${m}`) : {};
    for (const k of [...BASE, ...PAIRED, ...PAIRED.map((n) => `${n}-foreground`), ...MAP_TOKENS]) {
      if (!(k in sem)) fail(`semantic.${m}.${k}`, 'missing required token');
    }
  }
  sameKeys('semantic');

  for (const m of MODES) each(`elevation.${m}`, isStr, 'a CSS box-shadow');
  sameKeys('elevation');
  each(
    'elevation.reactNative',
    (v) => isObj(v) && RN_SHADOW.every((k) => isNum(v[k])),
    `{ ${RN_SHADOW.join(', ')} } numbers`,
  );

  each(
    'scale.radius.formula',
    (v) => RADIUS.test(v) || PX.test(v),
    '"radius", "radius ± Npx" or "Npx"',
  );
  if (!LENGTH.test(get('shape.radius')))
    fail('shape.radius', 'expected "Npx" or "Nrem"', get('shape.radius'));
  const formula = isObj(get('scale.radius.formula')) ? get('scale.radius.formula') : {};
  for (const [k, v] of entries(obj('shape'))) {
    if (k !== 'radius' && !(typeof v === 'string' && (v in formula || PX.test(v)))) {
      fail(`shape.${k}`, 'expected a scale.radius.formula name or "Npx"', v);
    }
  }

  each(
    'scale.type.size',
    (v) => isObj(v) && isNum(v.px) && isNum(v.line),
    '{ "px": number, "line": number }',
  );
  each(
    'scale.type.role',
    (v) => isObj(v) && ['display', 'sans'].includes(v.family) && v.weight in WEIGHT_NAMES,
    `{ "family": "display"|"sans", "weight": ${Object.keys(WEIGHT_NAMES).join('|')} }`,
  );
  for (const p of [
    'scale.space.steps',
    'scale.space.layout',
    'scale.size',
    'scale.motion.duration',
    'scale.breakpoint',
    'scale.zIndex',
  ])
    each(p, isNum, 'a number');
  for (const k of ['touch-min', 'touch-comfort', 'touch-primary'])
    if (!isNum(get(`scale.size.${k}`)))
      fail(`scale.size.${k}`, 'expected a number', get(`scale.size.${k}`));
  each('scale.motion.easing', isStr, 'a CSS easing');
  each(
    'scale.component',
    (v) =>
      isObj(v) && Object.values(v).every((x) => isNum(x) || (Array.isArray(x) && x.every(isNum))),
    'an object of numbers',
  );

  const list = get('pairs.list');
  if (!Array.isArray(list))
    fail('pairs.list', 'expected an array of [foreground, background, minRatio]', list);
  else
    list.forEach((p, i) => {
      if (!(
        Array.isArray(p) &&
        p.length === 3 &&
        isStr(p[0]) &&
        isStr(p[1]) &&
        isNum(p[2]) &&
        p[2] >= 1
      ))
        fail(`pairs.list[${i}]`, 'expected [foreground, background, minRatio]', p);
    });

  if (errors.length)
    throw new Error(
      `tokens.json has an unexpected shape (contract C2):\n  ${[...new Set(errors)].join('\n  ')}`,
    );
}

// ---------- colour ----------
function primitive(T, ref) {
  const [scale, step = 'DEFAULT'] = ref.split('.');
  return T.primitives?.color?.[scale]?.[step];
}
const resolveRef = (T, ref) => (ref.startsWith('#') ? ref : primitive(T, ref)).toUpperCase();
const resolve = (T, v) =>
  typeof v === 'string' ? { hex: resolveRef(T, v) } : { hex: resolveRef(T, v.ref), alpha: v.alpha };
const tokensFor = (T, mode) =>
  Object.fromEntries(Object.entries(T.semantic[mode]).map(([k, v]) => [k, resolve(T, v)]));

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (hex) => {
  const [r, g, b] = hex2rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
function hex2hsl(hex) {
  const [r, g, b] = hex2rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const f = (n) => Math.round(n * 10) / 10;
  return `${f(h)} ${f(s * 100)}% ${f(l * 100)}%`;
}

function checkContrast(T) {
  const errors = [];
  let checks = 0;
  for (const mode of MODES) {
    const tk = tokensFor(T, mode);
    T.pairs.list.forEach(([fg, bg, min], i) => {
      const missing = [fg, bg].filter((n) => !tk[n]);
      if (missing.length)
        return errors.push(
          `pairs.list[${i}] ${fg} on ${bg} (${mode}): unknown token ${missing.map((n) => `"${n}"`).join(', ')}`,
        );
      const r = ratio(tk[fg].hex, tk[bg].hex);
      checks++;
      if (r + 1e-9 < min)
        errors.push(`${mode}: ${fg} on ${bg} = ${r.toFixed(2)}:1, minimum ${min}:1`);
    });
  }
  if (errors.length)
    throw new Error(`Contrast check failed (${errors.length}):\n  ${errors.join('\n  ')}`);
  return checks;
}

// ---------- generate ----------
function generate(T, positron) {
  const header = (note = '') =>
    `/* GENERATED by packages/tokens/build.mjs from docs/design/tokens.json. Do not edit.${note} */\n`;
  const names = Object.keys(T.semantic.light);
  const tokens = Object.fromEntries(MODES.map((m) => [m, tokensFor(T, m)]));
  const hasAlpha = (n) => MODES.some((m) => tokens[m][n].alpha !== undefined);

  const [, baseN, baseUnit] = T.shape.radius.match(LENGTH);
  const basePx = Number(baseN) * (baseUnit === 'rem' ? 16 : 1);
  const radius = (v) => {
    // formula expression -> { css, px }
    const m = v.match(RADIUS);
    if (!m) return { css: v, px: Number(v.match(PX)[1]) };
    const n = Number(m[2] ?? 0),
      sign = m[1] === '-' ? -1 : 1;
    return {
      css: m[1] ? `calc(var(--radius) ${m[1]} ${n}px)` : 'var(--radius)',
      px: basePx + sign * n,
    };
  };
  const radii = {
    ...Object.fromEntries(entries(T.scale.radius.formula).map(([k, v]) => [k, radius(v)])),
    ...Object.fromEntries(
      entries(T.shape)
        .filter(([k]) => k !== 'radius')
        .map(([k, v]) => [k, radius(T.scale.radius.formula[v] ?? v)]),
    ),
  };
  const shapeKeys = entries(T.shape)
    .map(([k]) => k)
    .filter((k) => k !== 'radius');

  // fonts: one static name per (family, weight) used by a type role; the family's first role weight is its default
  const fontNative = {};
  for (const { family, weight } of Object.values(T.scale.type.role)) {
    const name = `${T.primitives.fontFamily[family].split(',')[0].replace(/['"\s]/g, '')}_${weight}${WEIGHT_NAMES[weight]}`;
    fontNative[family] ??= name;
    fontNative[`${family}-${WEIGHT_NAMES[weight].toLowerCase()}`] = name;
  }

  // CSS variables (tokens.css and native.css)
  const vars = (mode, radiusBase) => [
    ...names.flatMap((n) => [
      `--${n}: ${hex2hsl(tokens[mode][n].hex)};`,
      ...(hasAlpha(n) ? [`--${n}-alpha: ${tokens[mode][n].alpha ?? 1};`] : []),
    ]),
    ...(mode === 'light'
      ? [
          `--radius: ${radiusBase};`,
          ...Object.entries(T.primitives.fontFamily).map(([k, v]) => `--font-${k}: ${v};`),
          ...shapeKeys.map((k) => `--radius-${k}: ${radii[k].css};`),
        ]
      : []),
    ...Object.entries(T.elevation[mode]).map(([k, v]) => `--${k}: ${v};`),
  ];
  const block = (selector, lines) => `${selector} {\n${lines.map((l) => `  ${l}`).join('\n')}\n}\n`;
  const cssFile = (lightSel, darkSel, radiusBase, note) =>
    `${header(note)}\n${block(lightSel, vars('light', radiusBase))}\n${block(darkSel, vars('dark'))}`;

  const colourValue = (n, alphaValue) =>
    `hsl(var(--${n}) / ${hasAlpha(n) ? `var(--${n}-alpha)` : alphaValue})`;
  const webCss = `${header(' Tailwind 4: import after tokens.css.')}\n${block('@theme inline', [
    ...names.map((n) => `--color-${n}: ${hasAlpha(n) ? colourValue(n) : `hsl(var(--${n}))`};`),
    ...Object.entries(radii).map(([k, v]) => `--radius-${k}: ${v.css};`),
    ...Object.keys(T.primitives.fontFamily).map((k) => `--font-${k}: var(--font-${k});`),
    ...Object.keys(T.elevation.light).map((k) => `--${k}: var(--${k});`),
    ...Object.entries(T.scale.type.size).flatMap(([k, v]) => [
      `--text-${k}: ${v.px / 16}rem;`,
      `--text-${k}--line-height: ${v.line / 16}rem;`,
    ]),
  ])}`;

  const colors = {};
  for (const n of names) {
    const c = colourValue(n, '<alpha-value>');
    const chart = n.match(/^chart-(\d+)$/);
    if (PAIRED.includes(n)) colors[n] = { ...colors[n], DEFAULT: c };
    else if (n.endsWith('-foreground') && PAIRED.includes(n.slice(0, -11)))
      colors[n.slice(0, -11)] = { ...colors[n.slice(0, -11)], foreground: c };
    else if (chart) colors.chart = { ...colors.chart, [chart[1]]: c };
    else colors[n] = c;
  }
  const s = T.scale.size;
  const touch = {
    touch: `${s['touch-min']}px`,
    comfort: `${s['touch-comfort']}px`,
    primary: `${s['touch-primary']}px`,
  };
  const preset = {
    darkMode: 'class',
    theme: {
      extend: {
        colors,
        borderRadius: Object.fromEntries(Object.entries(radii).map(([k, v]) => [k, v.css])),
        fontFamily: Object.fromEntries(Object.entries(fontNative).map(([k, v]) => [k, [v]])),
        fontSize: Object.fromEntries(
          Object.entries(T.scale.type.size).map(([k, v]) => [k, [`${v.px}px`, `${v.line}px`]]),
        ),
        minHeight: touch,
        minWidth: touch,
        boxShadow: Object.fromEntries(
          Object.keys(T.elevation.light).map((k) => [k.replace(/^shadow-/, ''), `var(--${k})`]),
        ),
      },
    },
  };

  const hex = (t) =>
    t.alpha === undefined
      ? t.hex
      : t.hex +
        Math.round(t.alpha * 255)
          .toString(16)
          .padStart(2, '0')
          .toUpperCase();
  const ts = (name, v) => `export const ${name} = ${JSON.stringify(v, null, 2)} as const;\n`;
  const valuesTs = [
    header(' Resolved values for places classes cannot reach.'),
    ts(
      'colors',
      Object.fromEntries(
        MODES.map((m) => [m, Object.fromEntries(names.map((n) => [n, hex(tokens[m][n])]))]),
      ),
    ),
    ts('space', T.scale.space.steps),
    ts('layout', T.scale.space.layout),
    ts('size', T.scale.size),
    ts('component', Object.fromEntries(entries(T.scale.component))),
    ts('radius', Object.fromEntries(Object.entries(radii).map(([k, v]) => [k, v.px]))),
    ts('motion', { duration: T.scale.motion.duration, easing: T.scale.motion.easing }),
    ts('zIndex', T.scale.zIndex),
    ts('breakpoint', T.scale.breakpoint),
    ts('elevationNative', T.elevation.reactNative),
    ts('fonts', { css: T.primitives.fontFamily, native: fontNative }),
    'export type ColorToken = keyof typeof colors.light;\n',
  ].join('\n');

  const ids = positron.layers.map((l) => l.id);
  const lost = Object.keys(MAP_LAYERS).filter((id) => !ids.includes(id));
  if (lost.length)
    throw new Error(
      `openfreemap-positron.json: layer(s) ${lost.join(', ')} not found; update MAP_LAYERS in build.mjs`,
    );
  const base = { ...positron, layers: positron.layers.filter((l) => l.id in MAP_LAYERS) };
  const paint = Object.fromEntries(
    MODES.map((m) => [
      m,
      Object.fromEntries(
        Object.entries(MAP_LAYERS).map(([id, p]) => [
          id,
          Object.fromEntries(
            Object.entries(p).map(([prop, v]) => [
              prop,
              typeof v === 'string' ? tokens[m][v].hex : v,
            ]),
          ),
        ]),
      ),
    ]),
  );
  const mapStyleTs = `${header(' Base: OpenFreeMap "positron" (© OpenMapTiles © OpenStreetMap contributors).')}
/** Structural subset of maplibre's StyleSpecification (assignable to it), so this package needs no maplibre dependency. */
export type StyleSpecification = {
  version: 8;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- source and layer shapes belong to maplibre
  sources: Record<string, any>;
  sprite?: string;
  glyphs?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  layers: any[];
};
export type MapMode = 'light' | 'dark';

const base: StyleSpecification = ${JSON.stringify(base)};

const paint: Record<MapMode, Record<string, Record<string, string | number>>> = ${JSON.stringify(paint, null, 2)};

/** Calm map style (design system §9) in the map-* tokens. \`detail: true\` keeps minor streets (detail maps). */
export function buildMapStyle(mode: MapMode, opts: { detail?: boolean } = {}): StyleSpecification {
  return {
    ...base,
    layers: base.layers
      .filter((layer) => opts.detail || layer.id !== 'highway_minor')
      .map((layer) => ({ ...layer, paint: { ...layer.paint, ...paint[mode][layer.id] } })),
  };
}
`;

  return {
    'tokens.css': cssFile(
      ':root, .light',
      '.dark',
      T.shape.radius,
      ' Web: colours are HSL triplets, use hsl(var(--token)).',
    ),
    'web.css': webCss,
    'native.css': cssFile(
      ':root',
      '.dark:root',
      `${basePx}px`,
      ' NativeWind: --radius in px (NativeWind rem is 14px).',
    ),
    'tailwind-preset.cjs': `${header(' Tailwind 3.4 preset for NativeWind.')}module.exports = ${JSON.stringify(preset, null, 2)};\n`,
    'values.ts': valuesTs,
    'map-style.ts': mapStyleTs,
  };
}

// ---------- run ----------
try {
  const T = readJson(input);
  validate(T);
  const checks = checkContrast(T);
  const files = generate(T, readJson(path.join(here, 'openfreemap-positron.json')));
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(outDir, name), text);
  console.log(
    `@zivali/tokens: ${checks} contrast checks pass; wrote ${Object.keys(files).join(', ')} to ${path.relative(process.cwd(), outDir) || '.'}`,
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
