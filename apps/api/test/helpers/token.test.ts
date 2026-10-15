import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { config } from '../../lib/config.ts';
import { signTestToken } from './token.ts';

describe('signTestToken', () => {
	it('signs a Supabase-style access token that verifies with the local HS256 secret', async () => {
		const token = await signTestToken({ sub: '00000000-0000-4000-8000-000000000001', aal: 'aal2' });
		const { payload } = await jwtVerify(token, new TextEncoder().encode(config.SUPABASE_JWT_SECRET), {
			audience: 'authenticated',
		});
		expect(payload).toMatchObject({
			sub: '00000000-0000-4000-8000-000000000001',
			role: 'authenticated',
			aal: 'aal2',
			is_anonymous: false,
		});
	});
});
