import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthGate } from '@zivali/api/auth';
import { createMockApi } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';

import { AdminGate } from './admin-gate';

const auth = vi.hoisted(() => ({ gate: 'loading' as AuthGate, require: undefined as unknown }));
const replace = vi.hoisted(() => vi.fn());
vi.mock('@zivali/api/auth', () => ({
	useRequireAuth: (require: unknown) => ((auth.require = require), { gate: auth.gate }),
}));
vi.mock('@/i18n/navigation', () => ({
	Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
	useRouter: () => ({ replace }),
}));

afterEach(cleanup);

const renderGate = (gate: AuthGate) => {
	auth.gate = gate;
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<Provider store={createApiStore(createMockApi())}>
				<AdminGate require={{ role: 'ADMIN', aal2: true }}>
					<p>secret directory</p>
				</AdminGate>
			</Provider>
		</NextIntlClientProvider>
	);
};

describe('AdminGate', () => {
	it('renders the page only for an admin with aal2', () => {
		renderGate('ok');
		expect(screen.getByText('secret directory')).toBeTruthy();
		expect(auth.require).toEqual({ role: 'ADMIN', aal2: true });
	});

	it.each([
		['forbidden', sl.admin.denied_body],
		['aal2', sl.errors.AAL2_REQUIRED],
	] as const)('shows the access-denied screen for %s, with no data', (gate, body) => {
		renderGate(gate);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(sl.admin.denied_title);
		expect(screen.getByText(body)).toBeTruthy();
		expect(screen.queryByText('secret directory')).toBeNull();
	});

	it('sends signed-out users to sign-in with the page as next', () => {
		window.history.pushState({}, '', '/admin/zavetisca?q=1');
		renderGate('signin');
		expect(screen.queryByText('secret directory')).toBeNull();
		expect(replace).toHaveBeenCalledWith({ pathname: '/sign-in', query: { next: '/admin/zavetisca?q=1' } });
	});
});
