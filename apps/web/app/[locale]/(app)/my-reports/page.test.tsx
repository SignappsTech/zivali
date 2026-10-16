import { describe, expect, it, vi } from 'vitest';

import MyReportsPage from './page';

vi.mock('@/components/report/my-reports', () => ({ MyReports: () => null }));
vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));

async function deepLinkFor(searchParams: Record<string, unknown>) {
	const el = (await MyReportsPage({
		params: Promise.resolve({ locale: 'sl' }),
		searchParams: Promise.resolve(searchParams),
	} as never)) as { props: { children: [{ props: { children: { props: { deepLink?: unknown } } } }] } };
	return el.props.children[0].props.children.props.deepLink;
}

describe('my reports page', () => {
	it('passes a C10 link with a short code', async () => {
		expect(await deepLinkFor({ r: 'Rex12345', action: 'keep' })).toEqual({ code: 'Rex12345', action: 'keep' });
	});

	it.each(['../me', 'Rex1234', 'Rex12345/x', 'Rex1234l'])('drops the link for the code %s', async (r) => {
		expect(await deepLinkFor({ r, action: 'extend' })).toBeUndefined();
	});

	it('drops an unknown action', async () => {
		expect(await deepLinkFor({ r: 'Rex12345', action: 'delete' })).toBeUndefined();
	});
});
