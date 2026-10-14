#!/usr/bin/env node
// Builds A.html from template.html. Run after docs/design/build-tokens.mjs:
//   node docs/design/build-tokens.mjs && node docs/design/directions/src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..');
const T = JSON.parse(fs.readFileSync(path.join(out, '..', 'tokens.json'), 'utf8'));
const R = JSON.parse(fs.readFileSync(path.join(out, 'resolved.json'), 'utf8'));
const template = fs.readFileSync(path.join(here, 'template.html'), 'utf8');

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = h => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const grade = r => r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'UI' : 'low';
const bestText = bg => ratio(bg, '#101A1D') > ratio(bg, '#FFFFFF') ? '#101A1D' : '#FFFFFF';
const fmt = r => `${grade(r)} ${r.toFixed(1)}:1`;

function swatch(bgTok, label, fgTok, vsTok) {
  const L = R.light, D = R.dark;
  const cmp = m => fmt(ratio(m[bgTok], fgTok ? m[fgTok] : m[vsTok]));
  const chipStyle = `background:hsl(var(--${bgTok}));${fgTok ? `color:hsl(var(--${fgTok}));` : ''}`;
  const note = fgTok ? '' : ` vs ${vsTok}`;
  return `<div class="sw"><div class="sw-chip" style="${chipStyle}" aria-hidden="true">${fgTok ? 'Aa' : ''}</div><div class="sw-meta"><b title="${bgTok}">${label}</b><span class="hex" data-l="${L[bgTok]}" data-d="${D[bgTok]}"></span><span class="cr" data-l="${cmp(L)}${note}" data-d="${cmp(D)}${note}"></span></div></div>`;
}
function ramp(name) {
  const s = T.primitives.color[name];
  const cells = Object.entries(s).map(([k, v]) => `<div style="background:${v};color:${bestText(v)}">${k}</div>`).join('');
  return `<div class="ramp" role="img" aria-label="${name} scale" style="grid-template-columns:repeat(${Object.keys(s).length},minmax(0,1fr))">${cells}</div>`;
}
const grid = (items, cols = 4) => `<div class="grid gap-3" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${items.join('')}</div>`;

const palette = `
<p class="tile-h !mt-0">Brand: lagoon, with sun as the single warm accent</p>
<div class="grid gap-3">${ramp('lagoon')}${ramp('sun')}</div>
<p class="tile-h">Surfaces and roles</p>
${grid([
  swatch('background', 'background', 'foreground'), swatch('card', 'card', 'card-foreground'),
  swatch('primary', 'primary', 'primary-foreground'), swatch('secondary', 'secondary', 'secondary-foreground'),
  swatch('muted', 'muted', 'muted-foreground'), swatch('accent', 'accent', 'accent-foreground'),
  swatch('destructive', 'destructive', 'destructive-foreground'), swatch('input', 'input (field line)', null, 'card')
])}
<p class="tile-h">Pet status: solid for markers, tonal for the single pill, word colour for lists</p>
${grid([
  swatch('status-lost', 'status-lost', 'status-lost-foreground'), swatch('status-found', 'status-found', 'status-found-foreground'),
  swatch('status-sighted', 'status-sighted', 'status-sighted-foreground'), swatch('status-reunited', 'status-reunited', 'status-reunited-foreground'),
  swatch('status-lost-subtle', 'lost subtle', 'status-lost-subtle-foreground'), swatch('status-found-subtle', 'found subtle', 'status-found-subtle-foreground'),
  swatch('status-sighted-subtle', 'sighted subtle', 'status-sighted-subtle-foreground'), swatch('status-reunited-subtle', 'reunited subtle', 'status-reunited-subtle-foreground')
])}
<div class="flex flex-wrap gap-x-8 gap-y-3 mt-5">
  <span class="st st-lost st-lg"><i class="ph-fill ph-megaphone"></i>Izgubljena</span>
  <span class="st st-found st-lg"><i class="ph-fill ph-hand-heart"></i>Najdena</span>
  <span class="st st-sighted st-lg"><i class="ph-fill ph-eye"></i>Opažena</span>
  <span class="st st-reunited st-lg"><i class="ph-fill ph-heart"></i>Spet doma</span>
</div>
<p class="tile-h">Premium, verified, map</p>
${grid([
  swatch('premium', 'premium', 'premium-foreground'), swatch('verified', 'verified', 'verified-foreground'),
  swatch('map-land', 'map-land', 'map-label'), swatch('map-water', 'map-water', 'map-label'),
  swatch('map-park', 'map-park', 'map-label'), swatch('map-road', 'map-road', 'map-label'),
  swatch('marker-lost', 'marker-lost', null, 'map-land'), swatch('marker-found', 'marker-found', null, 'map-land')
])}`;

const html = template.replaceAll('{{PALETTE}}', palette).replaceAll('{{ID}}', 'a');
fs.writeFileSync(path.join(out, 'A.html'), html);
console.log('wrote A.html', html.length, 'bytes');
