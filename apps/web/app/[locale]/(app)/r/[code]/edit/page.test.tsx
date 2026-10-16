import { beforeEach, describe, expect, it, vi } from 'vitest';

import EditReportPage from './page';

const mocks = vi.hoisted(() => ({ getReport: vi.fn(), redirect: vi.fn((arg: unknown) => ({ redirected: arg })) }));
vi.mock('@/lib/report', () => ({ getReport: mocks.getReport }));
vi.mock('@/i18n/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/components/report/edit-report', () => ({ EditReport: () => null }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));

const run = () =>
	EditReportPage({ params: Promise.resolve({ locale: 'sl', code: 'Rex12345' }) } as never) as Promise<unknown>;
const toReport = { href: { pathname: '/r/[code]', params: { code: 'Rex12345' } }, locale: 'sl' };

describe('edit page', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		['not a manager', { is_mine: false, status: 'open' }],
		['an ended report', { is_mine: true, status: 'closed' }],
		['a reunited report', { is_mine: true, status: 'reunited' }],
	])('sends %s to the report', async (_name, report) => {
		mocks.getReport.mockResolvedValue({ report });
		await run();
		expect(mocks.redirect).toHaveBeenCalledWith(toReport);
	});

	it('sends a report that is not there to the report page too', async () => {
		mocks.getReport.mockResolvedValue(null);
		await run();
		expect(mocks.redirect).toHaveBeenCalledWith(toReport);
	});

	it.each(['open', 'matched'])('shows the form to a manager of a %s report', async (status) => {
		mocks.getReport.mockResolvedValue({ report: { is_mine: true, status } });
		await run();
		expect(mocks.redirect).not.toHaveBeenCalled();
	});
});
