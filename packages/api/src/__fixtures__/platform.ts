// Fixtures convention: `src/__fixtures__/<domain>.ts` exports wire-shaped values (snake_case) copied from the
// contract's example, imported as `@zivali/api/__fixtures__/<domain>` and served with createMockApi().
// This file holds the C1 examples.
import type { ApiErrorBody } from '../client.ts';

export const ping = { message: 'pong' };

export const rateLimited: ApiErrorBody = {
	error: { code: 'RATE_LIMITED', message: 'Too many reports', details: { retry_after_s: 1800 } },
};

export const validation: ApiErrorBody = {
	error: { code: 'VALIDATION', message: 'Invalid input', issues: [{ path: 'location.lat', message: 'Required' }] },
};
