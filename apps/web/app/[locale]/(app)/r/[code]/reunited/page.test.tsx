import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReunitedPage from './page';

const mocks = vi.hoisted(() => ({
	getReport: vi.fn(),
	getViewer: vi.fn(),
	redirect: vi.fn((arg: unknown) => ({ redirected: arg })),
}));
vi.mock('@/lib/report', () => ({ getReport: mocks.getReport }));
vi.mock('@/lib/viewer', () => ({ getViewer: mocks.getViewer }));
vi.mock('@/i18n/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/components/report/reunited', () => ({ Reunited: () => null }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));

const run = () =>
	ReunitedPage({ params: Promise.resolve({ locale: 'sl', code: 'Rex12345' }) } as never) as Promise<{
		props?: { anonymous: boolean };
	}>;
const toReport = { href: { pathname: '/r/[code]', params: { code: 'Rex12345' } }, locale: 'sl' };

describe('reunited page', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		['not a manager', { is_mine: false, status: 'reunited' }],
		['a report reopened meanwhile', { is_mine: true, status: 'open' }],
		['a closed report', { is_mine: true, status: 'closed' }],
	])('sends %s to the report', async (_name, report) => {
		mocks.getReport.mockResolvedValue({ report });
		await run();
		expect(mocks.redirect).toHaveBeenCalledWith(toReport);
	});

	it('shows a manager the reunited screen; a manage-link session is anonymous', async () => {
		mocks.getReport.mockResolvedValue({ report: { is_mine: true, status: 'reunited' } });
		mocks.getViewer.mockResolvedValue(null);
		expect((await run()).props?.anonymous).toBe(true);
		mocks.getViewer.mockResolvedValue({ id: 'u1' });
		expect((await run()).props?.anonymous).toBe(false);
		expect(mocks.redirect).not.toHaveBeenCalled();
	});
});
