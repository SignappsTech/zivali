import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { useEffect, useRef } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	CONSENT_VERSION,
	getConsent,
	getMockEvents,
	initAnalytics,
	isCurrent,
	parseConsent,
	resetMockEvents,
	trackScreen,
} from '@zivali/analytics';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';

import enConsent from '../../../../packages/i18n/messages/en/consent.json';
import { ConsentBanner, OPEN_COOKIE_SETTINGS } from './consent-banner';
import { consentCopy } from './copy';

vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/',
	useParams: () => ({}),
}));

let stored: string | null;
const storage = { get: () => stored, set: (value: string) => (stored = value) };

// As app/[locale]/layout.tsx does on the server: the cookie decides the first view, the catalogue makes the copy.
function banner(locale: 'sl' | 'en' = 'sl', extra: Record<string, string> = {}) {
	const consent = parseConsent(stored);
	const prompt = !isCurrent(consent);
	const messages = withChange(locale === 'sl' ? sl : en, extra);
	const t = createTranslator({ locale, messages, namespace: 'consent' });
	return <ConsentBanner prompt={prompt} copy={consentCopy(t as never, prompt, consent)} policyHref="/piskotki" />;
}
function mount(...args: Parameters<typeof banner>) {
	initAnalytics({ provider: 'mock', storage });
	return render(banner(...args));
}
const withChange = (m: typeof en, extra: Record<string, string>) =>
	({ ...m, consent: { ...m.consent, ...extra } }) as typeof en;
const record = (analytics: boolean, v = CONSENT_VERSION, ts = new Date().toISOString()) =>
	JSON.stringify({ v, analytics, ts });
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
	stored = null;
});
afterEach(cleanup);

describe('ConsentBanner', () => {
	it('is in the server HTML on a first visit or re-ask, so it paints with the page (TASK-90.4: no late LCP)', () => {
		expect(renderToString(banner('en'))).toContain('Cookies and your privacy');
		stored = record(true, CONSENT_VERSION, new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString());
		expect(renderToString(banner('en'))).toContain('It has been a year since your last choice');
		stored = record(false);
		expect(renderToString(banner('en'))).not.toContain('role="dialog"');
	});

	it('hydrates its server HTML in place: the first paint is the one that counts, not a re-render (TASK-112.1)', async () => {
		initAnalytics({ provider: 'mock', storage });
		const container = document.body.appendChild(document.createElement('div'));
		container.innerHTML = renderToString(banner('en'));
		const text = container.querySelector('#consent-body');
		const onRecoverableError = vi.fn();
		let root: Root | undefined;
		await act(async () => {
			root = hydrateRoot(container, banner('en'), { onRecoverableError });
		});

		expect(onRecoverableError).not.toHaveBeenCalled();
		expect(text).not.toBeNull();
		expect(container.querySelector('#consent-body')).toBe(text);
		act(() => root?.unmount());
		container.remove();
	});

	it('nothing reaches analytics before a choice: a page view waits for Accept all, Reject all drops it (C12)', () => {
		resetMockEvents();
		mount('en');
		trackScreen('/');
		expect(getMockEvents()).toEqual([]);
		fireEvent.click(button('Reject all'));
		trackScreen('/');
		expect(getMockEvents()).toEqual([]);
		cleanup();

		stored = null;
		mount('en');
		trackScreen('/');
		expect(getMockEvents()).toEqual([]);
		fireEvent.click(button('Accept all'));
		expect(getMockEvents()).toEqual([{ name: 'screen_view', params: { path: '/' } }]);
	});

	it('keeps focus when a page heading takes it on mount, though the banner is first in the body (TASK-112.1)', async () => {
		function PageHeading() {
			const ref = useRef<HTMLHeadingElement>(null);
			useEffect(() => ref.current?.focus(), []);
			return (
				<h1 ref={ref} tabIndex={-1}>
					Payment received
				</h1>
			);
		}
		initAnalytics({ provider: 'mock', storage });
		render(
			<>
				{banner('en')}
				<PageHeading />
			</>
		);

		const heading = screen.getByRole('heading', { name: 'Cookies and your privacy' });
		await waitFor(() => expect(document.activeElement).toBe(heading));
	});

	it('first visit: labelled dialog in the page language, focus on the heading, three equal buttons', async () => {
		mount('en');

		const dialog = screen.getByRole('dialog', { name: 'Cookie choice' });
		const heading = screen.getByRole('heading', { name: 'Cookies and your privacy' });
		await waitFor(() => expect(document.activeElement).toBe(heading));
		const buttons = ['Reject all', 'Accept all', 'Customise'].map(button);
		expect(buttons.map((b) => b.className)).toEqual([
			buttons[0]!.className,
			buttons[0]!.className,
			buttons[0]!.className,
		]);
		expect(dialog.querySelectorAll('button')).toHaveLength(3);
		expect(screen.getByRole('link', { name: 'Cookie policy' }).getAttribute('href')).toBe('/piskotki');
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

	it('Customise: the policy mention is a link; following it records no choice and the banner stays', () => {
		mount('en', { necessary_body: enConsent.necessary_body });
		fireEvent.click(button('Customise'));
		const link = screen.getAllByRole('link', { name: 'cookie policy' })[0]!;
		expect(link.getAttribute('href')).toBe('/piskotki');
		fireEvent.click(link);
		expect(getConsent()).toBeNull();
		expect(screen.getByRole('dialog')).toBeTruthy();
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

	it('version bump without a documented change shows no re-ask line; with change_<v> it names the change', () => {
		stored = record(true, CONSENT_VERSION - 1);
		mount('en');
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(screen.queryByText(/since your last choice/)).toBeNull();
		cleanup();

		stored = record(true, CONSENT_VERSION - 1);
		mount('en', { [`change_${CONSENT_VERSION}`]: 'we added maps' });
		expect(screen.getByText(/Something has changed since your last choice: we added maps/)).toBeTruthy();
	});
});
