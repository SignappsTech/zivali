import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockHandler, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { SlotA } from './slot-a';

const state = vi.hoisted(() => ({ gate: 'ok' as 'ok' | 'signin', push: vi.fn(), store: undefined as unknown }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: state.push, replace: vi.fn(), prefetch: vi.fn() }),
	useParams: () => ({ locale: 'sl' }),
	usePathname: () => '/r/Rex12345',
}));
// The P16 gate (gate.tsx, tested in auth.test.tsx): with a confirmed account it closes and continues at once; signed
// out or anonymous it shows its dialog.
vi.mock('@/components/auth/gate', async () => {
	const { useEffect } = await import('react');
	return {
		AuthGate: ({
			open,
			reason,
			onOpenChange,
			onReady,
		}: {
			open: boolean;
			reason: string;
			onOpenChange: (open: boolean) => void;
			onReady?: () => void;
		}) => {
			useEffect(() => {
				if (!open || state.gate !== 'ok') return;
				onOpenChange(false);
				onReady?.();
			}, [open, onOpenChange, onReady]);
			return open && state.gate !== 'ok' ? <div role="dialog">{`gate:${reason}`}</div> : null;
		},
	};
});
vi.mock('@/components/auth/gate-dialog', () => ({
	GateDialog: ({ open, unverifiedEmail }: { open: boolean; unverifiedEmail?: string }) =>
		open ? <div role="dialog">{`verify:${unverifiedEmail}`}</div> : null,
}));
vi.mock('@zivali/api/auth', () => ({ useSession: () => ({ me: { email: 'ana@zivali.test' } }) }));
// StoreProvider's store, over the mock API of the test.
vi.mock('@/lib/store', () => ({ getStore: () => state.store }));

const ID = 'c9a1d2e3-0000-4000-8000-000000000001';
function serve(answer: MockHandler | object = { id: ID }) {
	const api = createMockApi({ 'POST /v1/conversations': answer });
	state.store = createApiStore(api);
	return api;
}

const show = (report: Partial<DetailReport>) =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<SlotA report={{ ...publicReport, ...report } as DetailReport} />
		</NextIntlClientProvider>
	);
const r = sl.report;
/** Slot A's actions in order, with their variant (`default` is the primary). */
const actions = () =>
	[...document.querySelectorAll('[data-slot="button"]')].map((el) => [
		el.textContent,
		el.getAttribute('data-variant'),
	]);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
	state.gate = 'ok';
	state.push.mockReset();
	serve();
});
afterEach(cleanup);

describe('SlotA sighting (P9, TASK-30.2)', () => {
	it('opens the short sighting flow linked to a lost report', () => {
		show({ type: 'lost', short_code: 'Rex12345' });
		const href = screen.getByRole('link', { name: 'Sporoči opažanje' }).getAttribute('href')!;
		const url = new URL(href, 'http://localhost');
		expect(url.pathname).toBe('/prijava/najdena-zival');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			type: 'sighted',
			linked_report_id: publicReport.id,
			code: 'Rex12345',
			species: 'dog',
		});
	});

	it('opens the plain sighting flow from a found report (the API links sightings to lost reports only)', () => {
		show({ type: 'found' });
		expect(screen.getByRole('link', { name: 'Sporoči opažanje' }).getAttribute('href')).toBe(
			'/prijava/najdena-zival?type=sighted'
		);
	});

	it('offers no sighting on a sighting or to the report owner', () => {
		show({ type: 'sighted' });
		expect(screen.queryByRole('link', { name: 'Sporoči opažanje' })).toBeNull();
		cleanup();
		show({ type: 'lost', is_mine: true });
		expect(screen.queryByRole('link', { name: 'Sporoči opažanje' })).toBeNull();
	});
});

describe('SlotA contact (P9, C9, TASK-21.6)', () => {
	it('per type: lost sighting then the text "Pošlji sporočilo", found "To je moja žival" first, sighted both', () => {
		show({ type: 'lost' });
		expect(actions()).toEqual([
			[r.action_sighting, 'default'],
			[r.action_message, 'text'],
		]);
		cleanup();
		show({ type: 'found' });
		expect(actions()).toEqual([
			[r.action_mine, 'default'],
			[r.action_sighting, 'text'],
		]);
		cleanup();
		show({ type: 'sighted' });
		expect(actions()).toEqual([
			[r.action_message, 'default'],
			[r.action_mine, 'text'],
		]);
	});

	it('owners never see the contact actions', () => {
		show({ type: 'sighted', is_mine: true });
		expect(screen.queryByRole('button', { name: r.action_message })).toBeNull();
		expect(screen.queryByRole('button', { name: r.action_mine })).toBeNull();
	});

	it.each([
		['lost', r.action_message],
		['found', r.action_mine],
		['sighted', r.action_message],
		['sighted', r.action_mine],
	] as const)('%s: "%s" starts the conversation about the report and opens it', async (type, label) => {
		const api = serve();
		show({ type, short_code: 'Rex12345' });
		fireEvent.click(screen.getByRole('button', { name: label }));
		await vi.waitFor(() => expect(state.push).toHaveBeenCalledWith(`/nabiralnik/${ID}`));
		expect(api.calls.map((call) => [call.method, call.path, call.body])).toEqual([
			['POST', '/v1/conversations', { about_report_code: 'Rex12345' }],
		]);
	});

	it('signed out or anonymous: the P16 gate opens and nothing is sent', async () => {
		state.gate = 'signin';
		const api = serve();
		show({ type: 'lost' });
		fireEvent.click(screen.getByRole('button', { name: r.action_message }));
		expect((await screen.findByRole('dialog')).textContent).toContain('gate:contact');
		await flush();
		expect(api.calls).toEqual([]);
		expect(state.push).not.toHaveBeenCalled();
	});

	it('UNVERIFIED_EMAIL opens the verify dialog for the account address', async () => {
		serve(() => mockError('UNVERIFIED_EMAIL'));
		show({ type: 'found' });
		fireEvent.click(screen.getByRole('button', { name: r.action_mine }));
		expect((await screen.findByRole('dialog')).textContent).toContain('verify:ana@zivali.test');
		expect(state.push).not.toHaveBeenCalled();
	});

	it('RATE_LIMITED (contact, 10 a day) is a calm note, and the next press tries again', async () => {
		const api = serve(() => mockError('RATE_LIMITED', 'RATE_LIMITED', { retry_after_s: 3600 }));
		show({ type: 'lost' });
		fireEvent.click(screen.getByRole('button', { name: r.action_message }));
		expect((await screen.findByRole('status')).textContent).toContain(sl.report.contact_limited);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(state.push).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: r.action_message }));
		await vi.waitFor(() => expect(api.calls).toHaveLength(2));
	});

	it('another refusal is an error note, not a navigation', async () => {
		serve(() => mockError('FORBIDDEN'));
		show({ type: 'lost' });
		fireEvent.click(screen.getByRole('button', { name: r.action_message }));
		expect((await screen.findByRole('alert')).textContent).toContain(sl.errors.FORBIDDEN);
		expect(state.push).not.toHaveBeenCalled();
	});

	it('a second press while the first is on its way sends nothing more', async () => {
		let answer: (value: unknown) => void = () => undefined;
		const api = serve(() => new Promise((resolve) => (answer = resolve)));
		show({ type: 'sighted' });
		fireEvent.click(screen.getByRole('button', { name: r.action_message }));
		await vi.waitFor(() => expect(api.calls).toHaveLength(1));
		const message = screen.getByRole('button', { name: r.action_message });
		expect(message.getAttribute('aria-busy')).toBe('true');
		fireEvent.click(message);
		fireEvent.click(screen.getByRole('button', { name: r.action_mine }));
		await flush();
		expect(api.calls).toHaveLength(1);

		answer({ id: ID });
		await vi.waitFor(() => expect(state.push).toHaveBeenCalledTimes(1));
		expect(api.calls).toHaveLength(1);
	});
});
