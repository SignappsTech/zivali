import { describe, expect, it, vi } from 'vitest';

import AccountNotificationsPage from './page';

const calls = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/viewer', () => ({ requireViewer: vi.fn(async () => calls.push('requireViewer')) }));
vi.mock('next/navigation', () => ({
	redirect: vi.fn((url: string) => {
		calls.push(url);
		throw new Error('NEXT_REDIRECT');
	}),
}));

describe('the old notification settings URL (TASK-114.15)', () => {
	it.each([
		['sl', '/racun/opozorila#kako-vas-obvestimo'],
		['en', '/en/account/alerts#kako-vas-obvestimo'],
	])('%s: signs in first, then goes to the open section of the alerts page', async (locale, target) => {
		calls.length = 0;
		await expect(AccountNotificationsPage({ params: Promise.resolve({ locale }) } as never)).rejects.toThrow(
			'NEXT_REDIRECT'
		);
		expect(calls).toEqual(['requireViewer', target]);
	});
});
