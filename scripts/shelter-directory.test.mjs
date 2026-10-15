// TASK-88.1: responsible-shelter directory seed data (C18). Run: node --test scripts/
// Checks apps/api/prisma/seeders/data/{shelters,municipality_shelters}.csv against the GURS
// municipalities and prints the municipalities without a confirmed shelter for the client.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { loadFeatures } from './geo-to-sql.mjs';

const DATA = new URL('../apps/api/prisma/seeders/data/', import.meta.url);

// RFC 4180: fields with commas, quotes or line breaks are double-quoted, "" is a literal quote.
const parseCsv = (text) => {
	const rows = [[]];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') field += text[i++];
			else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',' || c === '\n') {
			rows.at(-1).push(field);
			field = '';
			if (c === '\n') rows.push([]);
		} else if (c !== '\r') field += c;
	}
	if (field || rows.at(-1).length) rows.at(-1).push(field);
	else rows.pop();
	const [header, ...body] = rows;
	return { header, rows: body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]]))) };
};

const load = (name) => parseCsv(readFileSync(new URL(`${name}.csv`, DATA), 'utf8'));
const shelters = load('shelters');
const assignments = load('municipality_shelters');
const municipalities = loadFeatures('municipalities').map((f) => f.properties);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const E164_SI = /^\+386[1-9]\d{5,7}$/;
const DAY = '(mon|tue|wed|thu|fri|sat|sun)';
const DAYS = new RegExp(`^${DAY}(-${DAY})?(,${DAY}(-${DAY})?)*$`);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const today = new Date().toISOString().slice(0, 10);
const isPastDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && d <= today;
// "01 256 02 79", "+386 1 256 02 79" and "080 88 49" all normalise to +386 and the national number.
const toE164 = (display) => `+386${display.replace(/\D/g, '').replace(/^(386|0)/, '')}`;

test('shelters.csv: 17 registered shelters with unique slugs and complete, sourced rows', () => {
	assert.deepEqual(shelters.header, [
		'slug',
		'name',
		'address',
		'postal_code',
		'city',
		'lat',
		'lng',
		'phone',
		'phone_display',
		'email',
		'website',
		'opening_hours',
		'registry_id',
		'source',
		'verified_at',
	]);
	assert.equal(shelters.rows.length, 17);
	const slugs = shelters.rows.map((s) => s.slug);
	assert.equal(new Set(slugs).size, 17, 'shelter slugs are unique');
	assert.equal(new Set(shelters.rows.map((s) => s.registry_id)).size, 17, 'registry ids are unique');
	for (const s of shelters.rows) {
		assert.match(s.slug, SLUG, `${s.slug}: ASCII lower-case slug`);
		for (const key of ['name', 'address', 'city', 'registry_id', 'source'])
			assert.ok(s[key]?.trim(), `${s.slug}: ${key} is set`);
		assert.match(s.postal_code, /^\d{4}$/, `${s.slug}: postal code`);
		assert.match(s.phone, E164_SI, `${s.slug}: phone is E.164`);
		assert.equal(toE164(s.phone_display), s.phone, `${s.slug}: phone_display is the same number`);
		assert.ok(!s.email || /^[^\s@]+@[^\s@]+\.[a-z]+$/.test(s.email), `${s.slug}: email`);
		assert.ok(!s.website || /^https?:\/\/\S+$/.test(s.website), `${s.slug}: website is a URL`);
		for (const key of ['lat', 'lng']) assert.ok(!s[key] || Number.isFinite(+s[key]), `${s.slug}: ${key}`);
		assert.ok(isPastDate(s.verified_at), `${s.slug}: verified_at is an ISO date, not in the future`);
		const hours = JSON.parse(s.opening_hours);
		assert.ok(Array.isArray(hours), `${s.slug}: opening_hours is a JSON array`);
		for (const h of hours) {
			assert.match(h.days, DAYS, `${s.slug}: opening_hours days "${h.days}"`);
			assert.match(h.from, TIME, `${s.slug}: opening_hours from`);
			assert.match(h.to, TIME, `${s.slug}: opening_hours to`);
			assert.ok(h.from < h.to, `${s.slug}: opening_hours from < to`);
			for (const key of Object.keys(h))
				assert.ok(['days', 'from', 'to', 'note_sl', 'note_en'].includes(key), `${s.slug}: ${key}`);
		}
	}
});

// species '' = all animals; a 'cat' or 'dog' row overrides it for that species.
const rowsBySlug = Object.groupBy(assignments.rows, (a) => a.municipality_slug);
const forSpecies = (rows, species) => rows.find((a) => a.species === species) ?? rows.find((a) => a.species === '');

test('municipality_shelters.csv: all 212 GURS municipalities, each confirmed row points at a shelter', () => {
	assert.deepEqual(assignments.header, [
		'municipality_slug',
		'municipality_name',
		'species',
		'shelter_slug',
		'status',
		'suggested_shelter',
		'source',
		'verified_at',
	]);
	const bySlug = new Map(municipalities.map((m) => [m.slug, m]));
	const shelterSlugs = new Set(shelters.rows.map((s) => s.slug));
	for (const a of assignments.rows) {
		const m = bySlug.get(a.municipality_slug);
		assert.ok(m, `${a.municipality_slug}: a GURS municipality slug`);
		assert.equal(a.municipality_name, m.name_sl, `${a.municipality_slug}: GURS name`);
		assert.ok(['', 'cat', 'dog'].includes(a.species), `${a.municipality_slug}: species "${a.species}"`);
		assert.ok(['CONFIRMED', 'UNCONFIRMED'].includes(a.status), `${a.municipality_slug}: status`);
		if (a.status === 'CONFIRMED')
			assert.ok(shelterSlugs.has(a.shelter_slug), `${a.municipality_slug}: shelter ${a.shelter_slug}`);
		else assert.equal(a.shelter_slug, '', `${a.municipality_slug}: unconfirmed rows name no shelter`);
		if (a.suggested_shelter)
			assert.ok(
				a.status === 'UNCONFIRMED' && shelterSlugs.has(a.suggested_shelter),
				`${a.municipality_slug}: suggested_shelter only on unconfirmed rows, an existing shelter`
			);
		assert.ok(a.source?.trim(), `${a.municipality_slug}: source is set`);
		if (a.status === 'UNCONFIRMED')
			assert.ok(
				a.source.startsWith('ni potrjeno:'),
				`${a.municipality_slug}: unconfirmed source starts with "ni potrjeno:"`
			);
		else
			assert.match(
				a.source,
				/https?:\/\/|[a-z0-9]\.[a-z]{2,}(?![a-z])/,
				`${a.municipality_slug}: confirmed source cites a URL or domain`
			);
		assert.ok(isPastDate(a.verified_at), `${a.municipality_slug}: verified_at`);
	}
	assert.deepEqual(Object.keys(rowsBySlug).sort(), [...bySlug.keys()].sort(), 'all 212 municipalities');
	for (const [slug, rows] of Object.entries(rowsBySlug)) {
		const species = rows.map((a) => a.species);
		assert.equal(new Set(species).size, rows.length, `${slug}: at most one row per species`);
		for (const s of ['cat', 'dog']) assert.ok(forSpecies(rows, s), `${slug}: resolves for ${s}s`);
	}
});

test('report: municipalities without a confirmed shelter (for the client)', (t) => {
	const open = Object.values(rowsBySlug).filter((rows) =>
		['cat', 'dog'].some((s) => forSpecies(rows, s).status === 'UNCONFIRMED')
	);
	const perShelter = Object.groupBy(
		assignments.rows.filter((a) => a.status === 'CONFIRMED'),
		(a) => a.shelter_slug
	);
	t.diagnostic(`confirmed for cats and dogs ${212 - open.length} / 212, open ${open.length}`);
	for (const s of shelters.rows) t.diagnostic(`  ${s.slug}: ${perShelter[s.slug]?.length ?? 0} municipality rows`);
	for (const rows of open)
		for (const a of rows.filter((r) => r.status === 'UNCONFIRMED'))
			t.diagnostic(
				`  UNCONFIRMED ${a.municipality_name}${a.species && ` (${a.species})`}` +
					`${a.suggested_shelter && ` [likely ${a.suggested_shelter}]`}: ${a.source}`
			);
});
