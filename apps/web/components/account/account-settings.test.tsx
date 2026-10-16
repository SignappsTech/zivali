import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { me } from '@zivali/api/__fixtures__/me';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';
import type { Me } from '@zivali/types';

import { AccountSettings } from './account-settings';

const state = vi.hoisted(() => ({
	me: null as Me | null,
	gate: 'loading',
	updateMe: vi.fn(),
}));
vi.mock('@zivali/api/auth', () => ({ useRequireAuth: () => ({ me: state.me, gate: state.gate }) }));
vi.mock('@zivali/api/me', () => ({ useUpdateMeMutation: () => [state.updateMe, { isLoading: false }] }));
vi.mock('@zivali/api/geocode', () => ({
	useReversePlaceQuery: () => ({ data: { lat: 46.06, lng: 14.51, label: 'Šiška, Ljubljana' } }),
}));
// Language and sign-out are the shell's (tested there).
vi.mock('@/components/shell/parts', () => ({
	LanguageSwitch: () => <div>language switch</div>,
	SignOutButton: (props: React.ComponentProps<'button'>) => <button type="button" {...props} />,
}));
vi.mock('@/i18n/navigation', () => ({
	Link: ({ href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props} />,
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

	it('shows the home area as approximate and links to the alerts page, without editing it here', () => {
		show(me);
		expect(screen.getByText(`Šiška, Ljubljana, 5 km (${sl.location.approximate_label})`)).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.alerts.area_change }).getAttribute('href')).toBe('/account/alerts');
		expect(screen.queryByLabelText(sl.location.search_label)).toBeNull();
		expect(screen.queryByRole('button', { name: sl.location.save_area })).toBeNull();
		expect(state.updateMe).not.toHaveBeenCalled();
	});

	it('offers a new confirmation link while the address is unconfirmed', () => {
		show({ ...me, email_verified: false });
		expect(screen.getByText(sl.profile.email_unverified)).toBeTruthy();
		expect(screen.getByRole('button', { name: sl.profile.email_send_link })).toBeTruthy();
	});
});
