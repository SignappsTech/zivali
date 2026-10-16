import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	env: { APP_ENV: 'staging', MOCK_WEBHOOK_SECRET: 'x', NEXT_PUBLIC_API_URL: 'http://api.test' },
}));
vi.mock('@/lib/env', () => ({ env: state.env }));
vi.mock('next/navigation', () => ({
	notFound: () => {
		throw new Error('NEXT_NOT_FOUND');
	},
}));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'sl' }));
vi.mock('@/i18n/navigation', () => ({ redirect: vi.fn() }));
vi.mock('./checkout', () => ({ MockCheckout: () => null, StartPayment: () => null }));

import { sendMockEvent } from './actions';
import CheckoutDevPage from './page';

const form = new FormData();
form.set('outcome', 'success');
form.set('payment_id', '11111111-1111-4111-8111-111111111111');
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterEach(() => vi.clearAllMocks());

describe('mock checkout guard (local only)', () => {
	it.each(['staging', 'production'])('page is not found on %s', async (appEnv) => {
		state.env.APP_ENV = appEnv;
		await expect(CheckoutDevPage({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow('NEXT_NOT_FOUND');
	});

	it.each(['staging', 'production'])('action refuses on %s and never signs or posts', async (appEnv) => {
		state.env.APP_ENV = appEnv;
		await expect(sendMockEvent(null, form)).rejects.toThrow('NEXT_NOT_FOUND');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('action refuses without a secret even on local', async () => {
		state.env.APP_ENV = 'local';
		state.env.MOCK_WEBHOOK_SECRET = undefined as never;
		await expect(sendMockEvent(null, form)).rejects.toThrow('NEXT_NOT_FOUND');
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
