import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me } from '@zivali/api/__fixtures__/me';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { Me } from '@zivali/types';

import { AccountSettings } from './account-settings';

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const state = vi.hoisted(() => ({
	me: null as Me | null,
	gate: 'loading',
	places: [] as { lat: number; lng: number; label: string }[],
	updateMe: vi.fn(),
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => ({ me: state.me, gate: state.gate }) }));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [state.updateMe, { isLoading: false }] }));
vi.mock('@zivali/api/geocode', () => ({
	usePlaceSearch: (q: string) => ({ places: q.length >= 3 ? state.places : [], isFetching: false }),
	useReversePlaceQuery: () => ({ data: { lat: 46.06, lng: 14.51, label: 'Šiška, Ljubljana' } }),
}));
// Language and sign-out are the shell's (tested there).
vi.mock('@/components/shell/parts', () => ({
	LanguageSwitch: () => <div>language switch</div>,
	SignOutButton: (props: React.ComponentProps<'button'>) => <button type="button" {...props} />,
}));
vi.mock('@/lib/auth', () => ({ resendConfirmation: vi.fn() }));

const unwrap = (value: unknown) => ({ unwrap: () => Promise.resolve(value) });
const rejects = (error: unknown) => ({ unwrap: () => Promise.reject(error) });

function show(profile: Me | null, gate = profile ? 'ok' : 'loading') {
	state.me = profile;
	state.gate = gate;
	return render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<AccountSettings />
		</NextIntlClientProvider>
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('AccountSettings', () => {
	it('waits for the profile with a skeleton', () => {
		show(null);
		expect(screen.getByText(sl.common.loading_page)).toBeTruthy();
	});

	it('saves the name and the optional phone, which it says is never public', async () => {
		state.updateMe.mockReturnValue(unwrap({}));
		show({ ...me, phone: null });
		expect(screen.getByText(sl.profile.phone_help)).toBeTruthy();
		fireEvent.change(screen.getByLabelText(sl.profile.name_label), { target: { value: ' Ana N. ' } });
		fireEvent.change(screen.getByLabelText(sl.profile.row_phone), { target: { value: '041 123 456' } });
		fireEvent.click(screen.getByRole('button', { name: sl.common.save }));

		await vi.waitFor(() =>
			expect(state.updateMe).toHaveBeenCalledWith({ display_name: 'Ana N.', phone: '041 123 456' })
		);
	});

	it('asks for a name and shows the API phone check on the field', async () => {
		state.updateMe.mockReturnValue(
			rejects(new ApiError('VALIDATION', 'VALIDATION', { issues: [{ path: 'phone', message: 'Invalid' }] }))
		);
		show(me);
		fireEvent.change(screen.getByLabelText(sl.profile.name_label), { target: { value: ' ' } });
		fireEvent.click(screen.getByRole('button', { name: sl.common.save }));
		expect(screen.getByRole('alert').textContent).toBe(sl.auth.error_name_required);
		expect(state.updateMe).not.toHaveBeenCalled();

		fireEvent.change(screen.getByLabelText(sl.profile.name_label), { target: { value: 'Ana' } });
		fireEvent.change(screen.getByLabelText(sl.profile.row_phone), { target: { value: 'abc' } });
		fireEvent.click(screen.getByRole('button', { name: sl.common.save }));
		expect((await screen.findByRole('alert')).textContent).toBe(sl.profile.phone_invalid);
		expect(screen.getByLabelText(sl.profile.row_phone).getAttribute('aria-invalid')).toBe('true');
	});

	it('shows the home area as approximate and saves a new place coarsened, with the radius', async () => {
		state.places = [{ lat: 46.0569, lng: 14.5058, label: 'Prešernov trg, Ljubljana' }];
		state.updateMe.mockReturnValue(unwrap({}));
		show(me);
		expect(screen.getByText(`Šiška, Ljubljana, 5 km (${sl.location.approximate_label})`)).toBeTruthy();

		fireEvent.change(screen.getByLabelText(sl.location.search_label), { target: { value: 'Prešernov' } });
		fireEvent.click(screen.getByRole('radio', { name: 'Prešernov trg, Ljubljana' }));
		fireEvent.click(screen.getByRole('button', { name: sl.location.save_area }));

		await vi.waitFor(() => expect(state.updateMe).toHaveBeenCalledOnce());
		const { home, home_radius_km } = state.updateMe.mock.calls[0]![0];
		expect(home_radius_km).toBe(5);
		// 20–30 m away from the picked point (C6), never the point itself.
		const metres = Math.hypot((home.lat - 46.0569) * 111_320, (home.lng - 14.5058) * 111_320 * Math.cos(0.804));
		expect(metres).toBeGreaterThan(15);
		expect(metres).toBeLessThan(35);
	});

	it('offers a new confirmation link while the address is unconfirmed', () => {
		show({ ...me, email_verified: false });
		expect(screen.getByText(sl.profile.email_unverified)).toBeTruthy();
		expect(screen.getByRole('button', { name: sl.profile.email_send_link })).toBeTruthy();
	});
});
