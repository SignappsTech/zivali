import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { env } from '@/lib/env';

import { proxy } from './proxy';

describe('content security policy', () => {
	it('lets signed photo URLs load: the storage origin is in img-src as well as connect-src', async () => {
		const response = await proxy(new NextRequest('https://najdimo.si/en/map'));
		const directives = Object.fromEntries(
			response.headers
				.get('content-security-policy')!
				.split('; ')
				.map((part) => [part.split(' ')[0], part])
		);
		const origin = new URL(env.R2_UPLOAD_ORIGIN).origin;

		expect(directives['img-src']).toContain(origin);
		expect(directives['connect-src']).toContain(origin);
	});
});
