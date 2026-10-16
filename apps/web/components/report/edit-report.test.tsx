import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { EditReport } from './edit-report';
import { flash } from './owner-actions';

// Radix's switch in a form measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => nav,
	usePathname: () => '/r/Rex12345/uredi',
	useParams: () => ({ locale: 'sl' }),
}));

const lost: DetailReport = {
	...ownerReport,
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	manager_role: 'owner',
	circumstances: 'Ušel je z vrta.',
	reward_eur: 50,
	reward_note: null,
};

function show(report: DetailReport, routes: MockRoutes = {}) {
	const api = createMockApi({
		'PATCH /v1/reports/:code': ({ body }) => ({ ...report, ...(body as object) }),
		...routes,
	});
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<Provider store={createApiStore(api)}>
				<EditReport report={report} />
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
const patches = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.method === 'PATCH').map((call) => call.body);
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Shrani' }));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	flash.message = undefined;
});

describe('EditReport (P9 "Uredi")', () => {
	it('starts from the report, saves the PATCH and goes back to the report, which says "Shranjeno."', async () => {
		const api = show(lost);

		expect(screen.getByRole('heading', { level: 1, name: 'Uredi prijavo' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Nazaj' }).getAttribute('href')).toBe('/r/Rex12345');
		expect(field(sl.report_lost.circumstances_label).value).toBe('Ušel je z vrta.');
		expect(screen.getByRole('switch', { name: sl.report_lost.reward_toggle }).getAttribute('aria-checked')).toBe(
			'true'
		);
		expect(field(sl.report_lost.reward_amount_label).value).toBe('50');
		expect(screen.getByText(sl.report_lost.reward_warning)).toBeTruthy();

		fireEvent.change(field(sl.report_lost.circumstances_label), { target: { value: '  Ušel je zvečer.  ' } });
		fireEvent.change(field(sl.report_lost.reward_note_label), { target: { value: 'tudi za podatek' } });
		save();

		await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/r/Rex12345'));
		expect(patches(api)).toEqual([
			{ circumstances: 'Ušel je zvečer.', reward_eur: 50, reward_note: 'tudi za podatek' },
		]);
		expect(flash.message).toBe(sl.common.toast_saved);
	});

	it('turning the reward off clears it', async () => {
		const api = show(lost);
		fireEvent.click(screen.getByRole('switch', { name: sl.report_lost.reward_toggle }));
		expect(screen.queryByLabelText(sl.report_lost.reward_amount_label)).toBeNull();
		save();

		await waitFor(() =>
			expect(patches(api)).toEqual([{ circumstances: 'Ušel je z vrta.', reward_eur: null, reward_note: null }])
		);
	});

	it.each([
		['an empty reward', '', '', sl.report_lost.reward_empty],
		['a broken amount', '5,5', '', sl.report_lost.reward_amount_invalid],
		['contact data in the note', '', 'pokličite 041 123 456', sl.report_lost.reward_note_contact_data],
	])('stops %s with its message and sends nothing', async (_case, eur, note, message) => {
		const api = show(lost);
		fireEvent.change(field(sl.report_lost.reward_amount_label), { target: { value: eur } });
		fireEvent.change(field(sl.report_lost.reward_note_label), { target: { value: note } });
		save();

		expect(await screen.findByText(message)).toBeTruthy();
		expect(patches(api)).toEqual([]);
	});

	it("shows the API's contact-data check on the note", async () => {
		show(lost, {
			'PATCH /v1/reports/:code': () =>
				new Response(
					JSON.stringify({
						error: {
							code: 'VALIDATION',
							message: 'VALIDATION',
							issues: [{ path: 'reward_note', message: 'CONTACT_DATA' }],
						},
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				),
		});
		save();

		expect(await screen.findByText(sl.report_lost.reward_note_contact_data)).toBeTruthy();
		expect(screen.queryByRole('alert', { name: sl.errors.VALIDATION })).toBeNull();
		expect(nav.push).not.toHaveBeenCalled();
	});

	it('a found report has no reward; a failure keeps the input and says why', async () => {
		show(
			{ ...ownerReport, short_code: 'Rex12345', circumstances: undefined },
			{
				'PATCH /v1/reports/:code': () => mockError('GONE'),
			}
		);
		expect(screen.queryByRole('switch')).toBeNull();
		fireEvent.change(field(sl.report_lost.circumstances_label), { target: { value: 'Pri meni je.' } });
		save();

		expect((await screen.findByRole('alert')).textContent).toBe(sl.errors.GONE);
		expect(field(sl.report_lost.circumstances_label).value).toBe('Pri meni je.');
		expect(nav.push).not.toHaveBeenCalled();
	});
});
