import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthGate } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import sl from '@zivali/i18n/dist/sl.json';

import { AdminShell } from './admin-shell';

const a = sl.admin;

const auth = vi.hoisted(() => ({
	gate: 'loading' as AuthGate,
	role: null as string | null,
	require: undefined as unknown,
	factors: { totp: [] as { id: string; status: string }[], all: [] as object[] },
	mfa: {
		listFactors: vi.fn(),
		unenroll: vi.fn(),
		enroll: vi.fn(),
		challengeAndVerify: vi.fn(),
	},
}));
vi.mock('@zivali/api/auth', () => ({
	useRequireAuth: (require: unknown) => ((auth.require = require), { gate: auth.gate, role: auth.role }),
	mfa: auth.mfa,
	signOut: vi.fn(),
}));
const route = vi.hoisted(() => ({ pathname: '/admin', replace: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
	Link: ({ href, children, ...props }: { href: unknown; children: React.ReactNode }) => (
		<a href={typeof href === 'string' ? href : JSON.stringify(href)} {...props}>
			{children}
		</a>
	),
	usePathname: () => route.pathname,
	useRouter: () => ({ replace: route.replace }),
	getPathname: ({ href }: { href: string }) => href,
}));

beforeEach(() => {
	auth.mfa.listFactors.mockImplementation(async () => auth.factors);
	auth.mfa.enroll.mockResolvedValue({
		id: 'f-new',
		totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'JBSWY3DPEHPK3PXP' },
	});
	auth.mfa.unenroll.mockResolvedValue({});
	auth.mfa.challengeAndVerify.mockResolvedValue({});
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	auth.factors = { totp: [], all: [] };
});

function renderShell(gate: AuthGate, { role = 'ADMIN', pathname = '/admin' } = {}) {
	auth.gate = gate;
	auth.role = role;
	route.pathname = pathname;
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
			<AdminShell env="staging" initials="MK">
				<p>admin page</p>
			</AdminShell>
		</NextIntlClientProvider>
	);
}

const sidebar = () => screen.getByRole('navigation', { name: a.breadcrumb_root });

describe('AdminShell', () => {
	it('asks for a staff role with aal2 and shows the full menu, environment and role to an admin', () => {
		renderShell('ok');
		expect(auth.require).toEqual({ role: 'MODERATOR', aal2: true });
		expect(screen.getByText('admin page')).toBeTruthy();
		const groups = [a.group_overview, a.group_content, a.group_safety, a.group_orgs, a.group_people];
		for (const group of [...groups, a.group_business, a.group_system])
			expect(within(sidebar()).getByRole('list', { name: group })).toBeTruthy();
		const dashboard = within(sidebar()).getByRole('link', { name: a.nav_dashboard });
		expect(dashboard.getAttribute('aria-current')).toBe('page');
		// Not built yet: the item still opens its page and says "Kmalu".
		expect(within(sidebar()).getByRole('link', { name: `${a.nav_ads}, ${a.coming_badge}` })).toBeTruthy();
		expect(within(sidebar()).getByRole('link', { name: a.nav_audit })).toBeTruthy();
		expect(screen.getByText(a.env_staging)).toBeTruthy();
		expect(screen.getByText(a.role_admin)).toBeTruthy();
		const crumbs = screen.getByRole('navigation', { name: a.breadcrumb_label });
		expect(within(crumbs).getByText(a.nav_dashboard).getAttribute('aria-current')).toBe('page');
		expect(screen.getByRole('main').textContent).toBe('admin page');
	});

	it('shows moderators only Overview and Safety, and refuses admin-only pages without rendering them', () => {
		renderShell('ok', { role: 'MODERATOR', pathname: '/admin/audit-log' });
		expect(within(sidebar()).getAllByRole('list').length).toBe(2);
		expect(within(sidebar()).getByRole('list', { name: a.group_overview })).toBeTruthy();
		expect(within(sidebar()).getByRole('list', { name: a.group_safety })).toBeTruthy();
		expect(within(sidebar()).queryByRole('link', { name: a.nav_audit })).toBeNull();
		expect(within(sidebar()).getByRole('link', { name: `${a.nav_moderation}, ${a.coming_badge}` })).toBeTruthy();
		expect(screen.getByText(a.role_moderator)).toBeTruthy();
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(a.denied_title);
		expect(screen.queryByText('admin page')).toBeNull();
	});

	it('refuses non-staff with the plain screen: no menu, no page, no hint of the console', () => {
		renderShell('forbidden', { role: 'USER' });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(a.denied_title);
		expect(screen.getByText(a.denied_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: a.denied_back }).getAttribute('href')).toBe('/');
		expect(screen.queryByRole('navigation')).toBeNull();
		expect(screen.queryByText('admin page')).toBeNull();
		expect(screen.queryByText(a.breadcrumb_root)).toBeNull();
		expect(auth.mfa.listFactors).not.toHaveBeenCalled();
	});

	it('sends a signed-out visitor to sign-in with the page as next', () => {
		window.history.replaceState(null, '', '/admin/revizijska-sled?x=1');
		renderShell('signin');
		expect(route.replace).toHaveBeenCalledWith({
			pathname: '/sign-in',
			query: { next: '/admin/revizijska-sled?x=1' },
		});
		expect(screen.queryByText('admin page')).toBeNull();
	});

	it('takes staff with a factor to the code screen; a wrong code says so, a right one verifies that factor', async () => {
		auth.factors = { totp: [{ id: 'f-1', status: 'verified' }], all: [{ id: 'f-1' }] };
		renderShell('aal2', { role: 'MODERATOR' });
		expect(await screen.findByRole('heading', { level: 1, name: a.mfa_title })).toBeTruthy();
		expect(screen.queryByText('admin page')).toBeNull();
		expect(screen.queryByRole('navigation', { name: a.breadcrumb_root })).toBeNull();
		const field = screen.getByLabelText(a.mfa_label);
		await waitFor(() => expect(document.activeElement).toBe(field));

		fireEvent.change(field, { target: { value: '12' } });
		fireEvent.click(screen.getByRole('button', { name: a.mfa_submit }));
		expect(await screen.findByText(a.mfa_wrong)).toBeTruthy();
		expect(field.getAttribute('aria-invalid')).toBe('true');
		expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();

		auth.mfa.challengeAndVerify.mockRejectedValueOnce(new ApiError('VALIDATION', 'VALIDATION'));
		fireEvent.change(field, { target: { value: '000 000' } });
		fireEvent.click(screen.getByRole('button', { name: a.mfa_submit }));
		await waitFor(() => expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith('f-1', '000000'));
		expect(await screen.findByText(a.mfa_wrong)).toBeTruthy();

		fireEvent.change(field, { target: { value: '482913' } });
		fireEvent.click(screen.getByRole('button', { name: a.mfa_submit }));
		await waitFor(() => expect(auth.mfa.challengeAndVerify).toHaveBeenLastCalledWith('f-1', '482913'));
		expect(auth.mfa.enroll).not.toHaveBeenCalled();
	});

	it('enrols staff without a factor: removes a stale enrolment, shows the QR code and key, confirms the new factor', async () => {
		auth.factors = { totp: [], all: [{ id: 'f-stale', factor_type: 'totp', status: 'unverified' }] };
		renderShell('aal2');
		expect(await screen.findByRole('heading', { level: 1, name: a.enrol_title })).toBeTruthy();
		expect(auth.mfa.unenroll).toHaveBeenCalledWith('f-stale');
		expect(screen.getByRole('img', { name: a.enrol_qr_alt }).getAttribute('src')).toBe(
			'data:image/svg+xml;utf-8,<svg/>'
		);
		expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeTruthy();
		fireEvent.change(screen.getByLabelText(a.enrol_code), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: a.enrol_submit }));
		await waitFor(() => expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith('f-new', '123456'));
		// The console header names the environment and offers sign-out on the TOTP screens.
		expect(screen.getByText(a.env_staging)).toBeTruthy();
		expect(screen.getByRole('button', { name: a.sign_out })).toBeTruthy();
	});

	it('shows an error with retry when the factors cannot be read', async () => {
		auth.mfa.listFactors.mockRejectedValueOnce(new ApiError('NETWORK', 'NETWORK'));
		renderShell('aal2');
		fireEvent.click(await screen.findByRole('button', { name: a.retry }));
		expect(await screen.findByRole('heading', { level: 1, name: a.enrol_title })).toBeTruthy();
		expect(auth.mfa.listFactors).toHaveBeenCalledTimes(2);
	});
});
