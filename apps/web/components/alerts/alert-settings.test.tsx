import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { me } from '@zivali/api/__fixtures__/me';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { AlertSubscription, LatLng, Me } from '@zivali/types';

import { AlertSettings } from './alert-settings';

const state = vi.hoisted(() => ({
	me: null as Me | null,
	gate: 'loading',
	verified: true,
	sub: {} as { data?: AlertSubscription | null; isError?: boolean },
	refetch: vi.fn(),
	save: vi.fn(),
	remove: vi.fn(),
	updateMe: vi.fn(),
	dispatch: vi.fn(),
	upsertQueryData: vi.fn((...args: unknown[]) => ({ type: 'upsertQueryData', args })),
	/** Where the stubbed picker is moved to before its Save; undefined leaves it on the stored point. */
	moveTo: undefined as LatLng | undefined,
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => ({ me: state.me, gate: state.gate }) }));
vi.mock('@zivali/api/alerts', () => ({
	alertsApi: { util: { upsertQueryData: state.upsertQueryData } },
	useGetAlertSubscriptionQuery: () => ({ refetch: state.refetch, ...state.sub }),
	useSaveAlertSubscriptionMutation: () => [state.save, { isLoading: false }],
	useDeleteAlertSubscriptionMutation: () => [state.remove, { isLoading: false }],
}));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [state.updateMe] }));
vi.mock('@zivali/api/geocode', () => ({
	useReversePlaceQuery: () => ({ currentData: { label: 'Šiška, Ljubljana' } }),
}));
vi.mock('react-redux', async (actual) => ({ ...(await actual()), useStore: () => ({ dispatch: state.dispatch }) }));
// The P16 gate: a confirmed account goes on at once, an unconfirmed one gets "Potrdite svoj e-naslov".
vi.mock('@/components/auth/gate', () => ({
	AuthGate: ({
		open,
		onOpenChange,
		onReady,
	}: {
		open: boolean;
		onOpenChange(open: boolean): void;
		onReady(): void;
	}) => {
		React.useEffect(() => {
			if (!open || !state.verified) return;
			onOpenChange(false);
			onReady();
		}, [open, onOpenChange, onReady]);
		return open && !state.verified ? <p role="dialog">{sl.auth.gate_unverified_title}</p> : null;
	},
}));
// The picker (TASK-15.3, tested there) as a stub: shows what it opened with, Save hands back the stored point unmoved
// or the coarsened point it was moved to.
vi.mock('@/components/location/location-picker', async (actual) => ({
	...(await actual()),
	LocationPicker: ({
		value,
		onChange,
	}: {
		value?: { point: LatLng; radiusM?: number };
		onChange(value: { point: LatLng; radiusM?: number; source: string }): void;
	}) => (
		<div>
			<output data-testid="picker-value">{JSON.stringify(value ?? null)}</output>
			<button
				type="button"
				onClick={() =>
					onChange({ point: state.moveTo ?? value!.point, radiusM: value?.radiusM ?? 5000, source: 'pin' })
				}
			>
				{sl.location.save_area}
			</button>
		</div>
	),
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const alerts = sl.alerts;
const resolves = (value?: unknown) => ({ unwrap: () => Promise.resolve(value) });
const refuses = () => ({ unwrap: () => Promise.reject(new ApiError('FORBIDDEN', 'FORBIDDEN', { status: 403 })) });
const stored: AlertSubscription = {
	center: { lat: 46.0739, lng: 14.4851 },
	radius_km: 5,
	species: ['dog', 'cat'],
	paused: false,
	daily_cap: 5,
	created_at: '2026-10-15T08:00:00Z',
	updated_at: '2026-10-15T08:00:00Z',
};
const input = ({ center, radius_km, species, paused }: AlertSubscription) => ({ center, radius_km, species, paused });
const master = () => screen.getByRole('switch', { name: alerts.master_label });
const slider = () => screen.getByRole('slider', { name: alerts.radius_label }) as HTMLInputElement;
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function show(sub: AlertSubscription | null | undefined, profile: Me | null = me) {
	state.me = profile;
	state.gate = profile ? 'ok' : 'loading';
	state.sub = { data: sub };
	return render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<AlertSettings />
		</NextIntlClientProvider>
	);
}

beforeEach(() => {
	state.verified = true;
	state.moveTo = undefined;
	state.save.mockImplementation((body: unknown) => resolves({ ...stored, ...(body as object) }));
	state.remove.mockReturnValue(resolves());
	state.updateMe.mockReturnValue(resolves(me));
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('AlertSettings (P13 web)', () => {
	it('waits with a skeleton, and shows the inline error with a retry when the subscription fails', () => {
		show(undefined);
		expect(screen.getByText(sl.common.loading_page)).toBeTruthy();

		cleanup();
		state.me = me;
		state.sub = { isError: true };
		render(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<AlertSettings />
			</NextIntlClientProvider>
		);
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.refetch).toHaveBeenCalled();
	});

	it('off shows the master switch and the link to the channels; on saves the home area with dogs and cats', async () => {
		show(null);

		expect(master().getAttribute('aria-checked')).toBe('false');
		expect(screen.getAllByRole('switch')).toHaveLength(1);
		expect(screen.queryByRole('slider')).toBeNull();
		expect(screen.getByRole('link', { name: alerts.channels_title }).getAttribute('href')).toBe('/racun/obvestila');

		fireEvent.click(master());
		await flush();
		expect(state.save).toHaveBeenCalledWith({
			center: me.home,
			radius_km: me.home_radius_km,
			species: ['dog', 'cat'],
			paused: false,
		});
		expect(state.upsertQueryData).toHaveBeenCalledWith('getAlertSubscription', undefined, expect.anything());
		expect(toast.success).toHaveBeenCalledWith(sl.profile.saved);
		// alert_opt_in with registered params only: both animals chosen, so no species, and never the area.
		expect(getMockEvents()).toEqual([{ name: 'alert_opt_in', params: {} }]);
	});

	it('alert_opt_in is dropped without analytics consent', async () => {
		setConsent({ analytics: false });
		show(null);
		fireEvent.click(master());
		await flush();
		expect(state.save).toHaveBeenCalled();
		expect(getMockEvents()).toEqual([]);
	});

	it('an unconfirmed email gets the confirm prompt and nothing is saved', () => {
		state.verified = false;
		show(null, { ...me, email_verified: false });

		fireEvent.click(master());
		expect(screen.getByRole('dialog').textContent).toBe(sl.auth.gate_unverified_title);
		expect(state.save).not.toHaveBeenCalled();
		expect(master().getAttribute('aria-checked')).toBe('false');
	});

	it('on: the area, the radius, the animals and pause; pause and animals save at once; off deletes', async () => {
		show(stored);

		expect(screen.getByText('Šiška, Ljubljana, 5 km')).toBeTruthy();
		expect(slider().getAttribute('aria-valuetext')).toBe('5 km');
		const pause = screen.getByRole('switch', { name: alerts.pause_label });
		expect(pause.getAttribute('aria-checked')).toBe('false');
		expect(document.getElementById(pause.getAttribute('aria-describedby')!)?.textContent).toBe(alerts.pause_help);

		fireEvent.click(pause);
		await flush();
		expect(state.save).toHaveBeenLastCalledWith({ ...input(stored), paused: true });
		expect(state.updateMe).not.toHaveBeenCalled();
		expect(getMockEvents()).toEqual([]); // not an opt-in

		const cats = screen.getByRole('button', { name: alerts.species_cats });
		expect(cats.getAttribute('aria-pressed')).toBe('true');
		fireEvent.click(cats);
		await flush();
		expect(state.save).toHaveBeenLastCalledWith({ ...input(stored), species: ['dog'] });

		fireEvent.click(master());
		await flush();
		expect(state.remove).toHaveBeenCalled();
		expect(state.upsertQueryData).toHaveBeenLastCalledWith('getAlertSubscription', undefined, null);
	});

	it('the last chosen animal can be switched off too: nothing chosen saves an empty list and says so', async () => {
		show({ ...stored, species: ['cat'] });
		const cats = screen.getByRole('button', { name: alerts.species_cats }) as HTMLButtonElement;
		expect([cats.disabled, cats.getAttribute('aria-pressed')]).toEqual([false, 'true']);
		expect(screen.queryByText(alerts.species_none)).toBeNull();
		fireEvent.click(cats);
		await flush();
		expect(state.save).toHaveBeenLastCalledWith({ ...input(stored), species: [] });

		cleanup();
		show({ ...stored, species: [] });
		for (const name of [alerts.species_dogs, alerts.species_cats]) {
			const pill = screen.getByRole('button', { name }) as HTMLButtonElement;
			expect([pill.disabled, pill.getAttribute('aria-pressed')]).toEqual([false, 'false']);
		}
		expect(screen.getByText(alerts.species_none)).toBeTruthy();
	});

	it('the radius shows each stop while it moves and saves once, where it is let go, for the profile too', async () => {
		show(stored);

		fireEvent.input(slider(), { target: { value: '5' } }); // 7 km
		fireEvent.input(slider(), { target: { value: '6' } }); // 10 km
		expect(slider().getAttribute('aria-valuetext')).toBe('10 km');
		expect(state.save).not.toHaveBeenCalled();

		fireEvent.change(slider());
		await flush();
		expect(state.save).toHaveBeenCalledTimes(1);
		expect(state.save).toHaveBeenCalledWith({ ...input(stored), radius_km: 10 });
		expect(state.updateMe).toHaveBeenCalledWith({ home_radius_km: 10 });
	});

	it('the number field snaps to the nearest stop on Enter; the same radius saves nothing', async () => {
		show(stored);
		const field = screen.getByRole('spinbutton', { name: alerts.radius_number_label });

		fireEvent.change(field, { target: { value: '6' } });
		fireEvent.keyDown(field, { key: 'Enter' });
		expect(state.save).not.toHaveBeenCalled();
		expect((field as HTMLInputElement).value).toBe('5');

		fireEvent.change(field, { target: { value: '12' } });
		fireEvent.blur(field);
		await flush();
		expect(state.save).toHaveBeenCalledWith({ ...input(stored), radius_km: 10 });
	});

	it('a refused change moves the control back and says why', async () => {
		state.save.mockReturnValue(refuses());
		show(stored);

		fireEvent.input(slider(), { target: { value: '6' } });
		fireEvent.change(slider());
		await flush();
		expect(toast.error).toHaveBeenCalledWith(sl.errors.FORBIDDEN);
		expect(slider().getAttribute('aria-valuetext')).toBe('5 km');
		expect(state.updateMe).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('switch', { name: alerts.pause_label }));
		await flush();
		expect(screen.getByRole('switch', { name: alerts.pause_label }).getAttribute('aria-checked')).toBe('false');
	});

	it('without a home area, turning on opens the picker and its save turns alerts on there, home included', async () => {
		show(null, { ...me, home: null });
		state.moveTo = { lat: 46.05, lng: 14.5 };

		fireEvent.click(master());
		expect(screen.getByTestId('picker-value').textContent).toBe('null');
		fireEvent.click(screen.getByRole('button', { name: sl.location.save_area }));
		await flush();
		expect(state.save).toHaveBeenCalledWith({
			center: state.moveTo,
			radius_km: 5,
			species: ['dog', 'cat'],
			paused: false,
		});
		expect(state.updateMe).toHaveBeenCalledWith({ home_radius_km: 5, home: state.moveTo });
		expect(getMockEvents()).toEqual([{ name: 'alert_opt_in', params: {} }]);
		expect(screen.queryByTestId('picker-value')).toBeNull();
	});

	it('"Spremeni" opens the stored area; saved unmoved, the stored centre goes back as is and the profile keeps its point', async () => {
		show(stored, { ...me, home: stored.center });

		fireEvent.click(screen.getByRole('button', { name: alerts.area_change }));
		expect(JSON.parse(screen.getByTestId('picker-value').textContent!)).toEqual({
			point: stored.center,
			radiusM: 5000,
		});
		fireEvent.click(screen.getByRole('button', { name: sl.location.save_area }));
		await flush();
		expect(state.save).toHaveBeenCalledWith(input(stored));
		expect(state.updateMe).toHaveBeenCalledWith({ home_radius_km: 5 });
		expect(getMockEvents()).toEqual([]);
	});

	it('a refused area keeps the picker open', async () => {
		state.save.mockReturnValue(refuses());
		show(stored);
		fireEvent.click(screen.getByRole('button', { name: alerts.area_change }));
		fireEvent.click(screen.getByRole('button', { name: sl.location.save_area }));
		await flush();
		expect(toast.error).toHaveBeenCalled();
		expect(screen.getByTestId('picker-value')).toBeTruthy();
	});
});
