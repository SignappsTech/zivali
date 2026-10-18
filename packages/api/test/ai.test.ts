import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PhotoAttributes } from '@zivali/types';

import * as fx from '../src/__fixtures__/ai.ts';
import { photo } from '../src/__fixtures__/photos.ts';
import { visualMatch } from '../src/__fixtures__/matches.ts';
import { createMockApi } from '../src/mock.ts';

const path = `/v1/photos/${photo.id}/attributes`;

test('GET /v1/photos/:id/attributes: pending for the first polls, then ready', async () => {
	const client = createMockApi({ 'GET /v1/photos/:id/attributes': fx.attributesPendingThenReady() });
	const seen: PhotoAttributes[] = [];
	for (let i = 0; i < 4; i++) seen.push(await client.request<PhotoAttributes>('GET', path));
	assert.deepEqual(
		seen.map((r) => r.status),
		['pending', 'pending', 'ready', 'ready']
	);
	assert.deepEqual(seen[2], fx.attributesReady);
	assert.equal(client.calls[0]!.params.id, photo.id);
});

test('pending then any result; unavailable as a static fixture', async () => {
	const client = createMockApi({
		'GET /v1/photos/:id/attributes': fx.attributesPendingThenReady(fx.attributesNoAnimal, 1),
	});
	assert.deepEqual(await client.request('GET', path), { status: 'pending' });
	assert.deepEqual(await client.request('GET', path), fx.attributesNoAnimal);
	const off = createMockApi({ 'GET /v1/photos/:id/attributes': fx.attributesUnavailable });
	assert.deepEqual(await off.request('GET', path), { status: 'unavailable' });
});

test('fixtures cover every notice and the low-confidence path', () => {
	const ready = Object.values(fx).filter(
		(v): v is Extract<PhotoAttributes, { status: 'ready' }> => typeof v === 'object' && v.status === 'ready'
	);
	assert.deepEqual(
		new Set(ready.map((r) => r.notice)),
		new Set([null, 'no_animal', 'other_animal', 'multiple_animals'])
	);
	assert.equal(fx.attributesReady.status === 'ready' && fx.attributesReady.size?.value, null);
	assert.ok(ready.some((r) => r.breed_codes?.value === null && r.colours?.value === null));
});

test('a match fixture carries a visual reason with both photo ids', () => {
	const visual = visualMatch.reasons.find((r) => r.code === 'visual');
	assert.deepEqual(visual && { band: visual.band, lost: visual.lost_photo_id }, {
		band: 'very_similar',
		lost: photo.id,
	});
	assert.ok(visual?.code === 'visual' && visual.other_photo_id);
});
