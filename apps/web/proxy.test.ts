import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/lib/env';

import { proxy } from './proxy';

// lib/env.ts reads it on import (staging: https://media.najdimo.si).
vi.hoisted(() => {
	process.env.MEDIA_BASE_URL = 'https://media.zivali.test/zivali-media';
});

async function directives() {
	const response = await proxy(new NextRequest('https://najdimo.si/en/map'));
	return Object.fromEntries(
		response.headers
			.get('content-security-policy')!
			.split('; ')
			.map((part) => [part.split(' ')[0], part])
	);
}

describe('content security policy', () => {
	it('lets signed photo URLs load: the storage origin is in img-src as well as connect-src', async () => {
		const csp = await directives();
		const origin = new URL(env.R2_UPLOAD_ORIGIN).origin;

		expect(csp['img-src']).toContain(origin);
		expect(csp['connect-src']).toContain(origin);
	});

	it('lets published report photos load: img-src has the media origin next to the storage origin', async () => {
		const imgSrc = (await directives())['img-src'].split(' ');

		expect(imgSrc).toContain('https://media.zivali.test');
		expect(imgSrc).toContain(new URL(env.R2_UPLOAD_ORIGIN).origin);
	});
});
