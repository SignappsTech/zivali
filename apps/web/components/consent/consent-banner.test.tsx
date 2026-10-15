import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_VERSION, getConsent, initAnalytics } from '@zivali/analytics';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import { ConsentBanner, OPEN_COOKIE_SETTINGS } from './consent-banner';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/',
	useParams: () => ({}),
}));

let stored: string | null;
const storage = { get: () => stored, set: (value: string) => (stored = value) };

function mount(locale: 'sl' | 'en' = 'sl') {
	initAnalytics({ provider: 'mock', storage });
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en}>
			<ConsentBanner />
		</NextIntlClientProvider>
	);
}
const record = (analytics: boolean, v = CONSENT_VERSION, ts = new Date().toISOString()) =>
	JSON.stringify({ v, analytics, ts });
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
	stored = null;
});
afterEach(cleanup);

describe('ConsentBanner', () => {
	it('first visit: labelled dialog in the page language, focus on the heading, three equal buttons', () => {
		mount('en');

		const dialog = screen.getByRole('dialog', { name: 'Cookie choice' });
		expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Cookies and your privacy' }));
		const buttons = ['Reject all', 'Accept all', 'Customise'].map(button);
		expect(buttons.map((b) => b.className)).toEqual([
			buttons[0]!.className,
			buttons[0]!.className,
			buttons[0]!.className,
		]);
		expect(dialog.querySelectorAll('button')).toHaveLength(3);
		expect(getConsent()).toBeNull();
	});

	it('Reject all stores analytics:false and closes; Accept all stores analytics:true', () => {
		mount();
		fireEvent.click(button('Zavrni vse'));
		expect(getConsent()).toMatchObject({ v: CONSENT_VERSION, analytics: false });
		expect(screen.queryByRole('dialog')).toBeNull();
		cleanup();

		stored = null;
		mount();
		fireEvent.click(button('Sprejmi vse'));
		expect(getConsent()).toMatchObject({ analytics: true });
		expect(stored).toContain('"ts"');
	});

	it('Escape closes without storing a choice', () => {
		mount();
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(stored).toBeNull();
	});

	it('Customise: analytics switch is off, necessary is locked on; Save stores the switch, Back returns', () => {
		mount('en');
		fireEvent.click(button('Customise'));

		const analytics = screen.getByRole('switch', { name: 'Analytics cookies' }) as HTMLInputElement;
		expect(analytics.checked).toBe(false);
		const locked = screen.getAllByRole('switch').find((s) => (s as HTMLInputElement).disabled) as HTMLInputElement;
		expect(locked.checked).toBe(true);
		fireEvent.click(button('Back'));
		expect(screen.getByRole('heading', { name: 'Cookies and your privacy' })).toBeTruthy();
		fireEvent.click(button('Customise'));
		fireEvent.click(screen.getByRole('switch', { name: 'Analytics cookies' }));
		fireEvent.click(button('Save choice'));
		expect(getConsent()).toMatchObject({ analytics: true });
	});

	it('stays hidden with a current choice; Cookie settings reopens it with the stored choice, withdrawal saves false', () => {
		stored = record(true);
		mount('en');
		expect(screen.queryByRole('dialog')).toBeNull();

		act(() => {
			window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
		});
		expect((screen.getByRole('switch', { name: 'Analytics cookies' }) as HTMLInputElement).checked).toBe(true);
		expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
		fireEvent.click(screen.getByRole('switch', { name: 'Analytics cookies' }));
		fireEvent.click(button('Save choice'));

		expect(getConsent()).toMatchObject({ analytics: false });
		expect(screen.getByRole('status').textContent).toBe('Choice saved.');
	});

	it('asks again after a version bump or 12 months, saying why', () => {
		stored = record(true, CONSENT_VERSION - 1);
		mount('en');
		expect(screen.getByRole('dialog')).toBeTruthy();
		cleanup();

		stored = record(true, CONSENT_VERSION, new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString());
		mount('en');
		expect(screen.getByText(/It has been a year since your last choice/)).toBeTruthy();
	});
});
