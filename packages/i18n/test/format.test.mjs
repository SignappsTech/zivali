import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTranslator } from 'use-intl/core';

import { load } from '../build.mjs';
import { formatCount, formatDate, formatDistanceBand, formatEur, formatRelative, timeZone } from '../src/format.ts';

test('SL dual plurals through an ICU message (contract C16 example)', () => {
	const t = createTranslator({
		locale: 'sl',
		timeZone,
		messages: {
			browse: { results: '{count, plural, one {# prijava} two {# prijavi} few {# prijave} other {# prijav}}' },
		},
		namespace: 'browse',
	});
	assert.deepEqual(
		[1, 2, 3, 4, 5, 101, 102, 103].map((count) => t('results', { count })),
		['1 prijava', '2 prijavi', '3 prijave', '4 prijave', '5 prijav', '101 prijava', '102 prijavi', '103 prijave']
	);
});

test('server use: createTranslator with the merged catalogue (README)', () => {
	const messages = load();
	const sl = createTranslator({ locale: 'sl', timeZone, messages: messages.sl, namespace: 'errors' });
	const en = createTranslator({ locale: 'en', timeZone, messages: messages.en, namespace: 'errors' });
	assert.match(sl('RATE_LIMITED', { minutes: 1 }), /čez 1 minuto\.$/);
	assert.match(sl('RATE_LIMITED', { minutes: 2 }), /čez 2 minuti\.$/);
	assert.match(sl('RATE_LIMITED', { minutes: 3 }), /čez 3 minute\.$/);
	assert.match(sl('RATE_LIMITED', { minutes: 5 }), /čez 5 minut\.$/);
	assert.match(en('RATE_LIMITED', { minutes: 1 }), /in 1 minute\.$/);
	assert.equal(en('UNAUTHENTICATED'), 'Please sign in to continue.');
});

test('formatEur', () => {
	assert.equal(formatEur(500, 'sl'), '5,00\u00a0€' /* no-break space */);
	assert.equal(formatEur(12345678, 'sl'), '123.456,78\u00a0€');
	assert.equal(formatEur(500, 'en'), '€5.00');
});

test('formatDate uses Europe/Ljubljana whatever the machine time zone', () => {
	// 22:30 UTC on 15 October is 00:30 on 16 October in Ljubljana (CEST).
	const d = new Date('2026-10-15T22:30:00Z');
	assert.equal(formatDate(d, 'sl'), '16. 10. 2026');
	assert.equal(formatDate(d, 'sl', 'long'), '16. oktober 2026');
	assert.equal(formatDate(d, 'sl', 'time'), '00:30');
	assert.equal(formatDate(d, 'en'), '16/10/2026');
	assert.equal(formatDate(d, 'en', 'long'), '16 October 2026');
	assert.equal(formatDate('2026-01-15T23:30:00Z', 'en', 'time'), '00:30');
});

test('formatRelative', () => {
	const now = new Date('2026-10-15T12:00:00Z');
	const ago = (s) => new Date(now.getTime() - s * 1000);
	assert.equal(formatRelative(ago(5 * 60), 'sl', now), 'pred 5 minutami');
	assert.equal(formatRelative(ago(2 * 3600), 'sl', now), 'pred 2 urama');
	assert.equal(formatRelative(ago(30 * 3600), 'sl', now), 'včeraj');
	assert.equal(formatRelative(ago(20), 'sl', now), 'zdaj');
	assert.equal(formatRelative(ago(5 * 60), 'en', now), '5 minutes ago');
	assert.equal(formatRelative(ago(-2 * 3600), 'en', now), 'in 2 hours');
});

test('formatDistanceBand follows glossary §9', () => {
	assert.deepEqual(
		['lt1', '1to3', '3to10', 'gt10'].map((b) => formatDistanceBand(b, 'sl')),
		['manj kot 1 km', '1–3 km', '3–10 km', 'več kot 10 km']
	);
	assert.deepEqual(
		['lt1', '1to3', '3to10', 'gt10'].map((b) => formatDistanceBand(b, 'en')),
		['under 1 km', '1–3 km', '3–10 km', 'over 10 km']
	);
});

test('formatCount', () => {
	assert.equal(formatCount(5, 'sl'), '5');
	assert.equal(formatCount(12345, 'sl'), '12.345');
	assert.equal(formatCount(12345, 'en'), '12,345');
});
