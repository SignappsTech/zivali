import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import { ApiError } from '@zivali/api/client';
import { createMockApi, type MockHandler, mockError } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { MoreMenu } from '@/components/report/slots/more-menu';

import { type AbuseTarget, ReportAbuseDialog } from './report-abuse';

// The dialog brings its own StoreProvider; its store runs over the in-memory API.
const stores = vi.hoisted(() => ({ current: undefined as ApiStore | undefined }));
vi.mock('@/lib/store', () => ({ getStore: () => stores.current }));
// lib/auth is replaced outright (the dialog imports only ensureSession, lazily, on send).
const auth = vi.hoisted(() => ({ ensureSession: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
// Radix radios and the menu's popper measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const t = sl.abuse;
const REPORT: AbuseTarget = { type: 'report', id: '7c1e4b2a-0000-4000-8000-000000000001', title: 'Rex' };
const MESSAGE: AbuseTarget = { type: 'message', id: '9a8b7c6d-0000-4000-8000-000000000001' };

type Props = Omit<React.ComponentProps<typeof ReportAbuseDialog>, 'open' | 'onOpenChange'>;

/** The dialog opened from a button, as a page would; `report` answers POST /v1/abuse-reports. */
function show(props: Partial<Props> = {}, report: MockHandler = () => abuseCreated, locale: 'sl' | 'en' = 'sl') {
	const api = createMockApi({ 'POST /v1/abuse-reports': report });
	stores.current = createApiStore(api);
	function Page() {
		const [open, setOpen] = React.useState(false);
		return (
			<>
				<button type="button" onClick={() => setOpen(true)}>
					Opener
				</button>
				<ReportAbuseDialog target={REPORT} {...props} open={open} onOpenChange={setOpen} />
			</>
		);
	}
	render(
		<NextIntlClientProvider locale={locale} messages={{ sl, en }[locale]}>
			<Page />
		</NextIntlClientProvider>
	);
	const opener = screen.getByRole('button', { name: 'Opener' });
	opener.focus();
	fireEvent.click(opener);
	return { api, opener, posts: () => api.calls.filter((call) => call.path === '/v1/abuse-reports') };
}

const dialog = () => screen.getByRole('dialog');
const send = () => within(dialog()).getByRole('button', { name: t.send });
const choose = (name: string) => fireEvent.click(within(dialog()).getByRole('radio', { name }));
const note = () => within(dialog()).getByRole('textbox', { name: t.note_label });

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('ReportAbuseDialog (P10 web)', () => {
	it('opens on the heading with the target, five reasons and "Pošlji" disabled until a reason is chosen', () => {
		show();

		expect(dialog().getAttribute('aria-labelledby')).toBeTruthy();
		const heading = within(dialog()).getByRole('heading', { name: t.title });
		expect(document.activeElement).toBe(heading);
		expect(within(dialog()).getByText('Rex').closest('p')?.textContent).toBe('Glede objave: Rex');
		const group = within(dialog()).getByRole('radiogroup', { name: t.reason_label });
		expect(
			within(group)
				.getAllByRole('radio')
				.map((radio) => radio.textContent)
		).toEqual([t.reason_scam, t.reason_fake, t.reason_spam, t.reason_image, t.reason_other]);
		expect(send()).toHaveProperty('disabled', true);
		expect(within(dialog()).getByText(t.send_disabled_help).id).toBe(send().getAttribute('aria-describedby'));
		expect(within(dialog()).queryByRole('switch')).toBeNull();
		expect(within(dialog()).getByText(t.privacy)).toBeTruthy();
		// Nothing is made on open: the session waits for "Pošlji".
		expect(auth.ensureSession).not.toHaveBeenCalled();

		choose(t.reason_fake);
		expect(send()).toHaveProperty('disabled', false);
		expect(within(dialog()).queryByText(t.send_disabled_help)).toBeNull();
	});

	it('signs in anonymously on send, posts the reason and trimmed note, and thanks with focus on "Hvala"', async () => {
		const onSent = vi.fn();
		const { posts, opener } = show({ onSent });

		choose(t.reason_scam);
		fireEvent.change(note(), { target: { value: '  Asks for money upfront  ' } });
		fireEvent.click(send());

		const thanks = await within(dialog()).findByRole('heading', { name: t.done_title });
		expect(document.activeElement).toBe(thanks);
		expect(auth.ensureSession).toHaveBeenCalledOnce();
		expect(posts().map((call) => call.body)).toEqual([
			{ target_type: 'report', target_id: REPORT.id, reason: 'scam', note: 'Asks for money upfront' },
		]);
		expect(within(dialog()).getByRole('status').textContent).toContain(t.done_body);
		expect(within(dialog()).queryByText(t.done_blocked)).toBeNull();
		expect(onSent).toHaveBeenCalledWith({ blocked: false });

		fireEvent.click(within(dialog()).getByRole('button', { name: t.done_close }));
		expect(screen.queryByRole('dialog')).toBeNull();
		// Radix hands focus back on the next task.
		await waitFor(() => expect(document.activeElement).toBe(opener));
	});

	it('thanks a duplicate the same way and leaves out an empty note', async () => {
		const { posts } = show({}, () => ({ id: abuseCreated.id, duplicate: true }));

		choose(t.reason_other);
		fireEvent.change(note(), { target: { value: '   ' } });
		fireEvent.click(send());

		expect(await within(dialog()).findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(posts()[0]?.body).toEqual({ target_type: 'report', target_id: REPORT.id, reason: 'other' });
	});

	it('rate limited: a calm note, the choice kept, "Pošlji" disabled, no second request', async () => {
		const { posts } = show({}, () => mockError('RATE_LIMITED'));

		choose(t.reason_spam);
		fireEvent.change(note(), { target: { value: 'Same text everywhere' } });
		fireEvent.click(send());

		const limit = await within(dialog()).findByRole('status');
		expect(limit.textContent).toBe(t.rate_limited);
		expect(within(dialog()).queryByRole('alert')).toBeNull();
		expect(within(dialog()).getByRole('radio', { name: t.reason_spam }).getAttribute('aria-checked')).toBe('true');
		expect(note()).toHaveProperty('value', 'Same text everywhere');
		expect(send()).toHaveProperty('disabled', true);
		expect(send().getAttribute('aria-describedby')).toBe(limit.id);
		expect(posts()).toHaveLength(1);
	});

	it('two submits in the same tick start one request', async () => {
		let release = () => {};
		const { posts } = show({}, () => new Promise((resolve) => (release = () => resolve(abuseCreated))));

		choose(t.reason_spam);
		const form = send().closest('form')!;
		// One act: React renders once after both, so the second submit still sees `sending` false.
		act(() => {
			fireEvent.submit(form);
			fireEvent.submit(form);
		});
		await waitFor(() => expect(posts()).toHaveLength(1));
		release();

		expect(await within(dialog()).findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(posts()).toHaveLength(1);
	});

	it('a network error or 5xx keeps the choice and says so; nothing retries until "Pošlji" again', async () => {
		let fail = true;
		const { posts } = show({}, () => {
			if (!fail) return abuseCreated;
			fail = false;
			throw new TypeError('Failed to fetch');
		});

		choose(t.reason_image);
		fireEvent.change(note(), { target: { value: 'Not this dog' } });
		fireEvent.click(send());

		expect((await within(dialog()).findByRole('alert')).textContent).toBe(t.error);
		expect(within(dialog()).getByRole('radio', { name: t.reason_image }).getAttribute('aria-checked')).toBe('true');
		expect(note()).toHaveProperty('value', 'Not this dog');
		expect(posts()).toHaveLength(1);

		fireEvent.click(send());
		expect(await within(dialog()).findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(posts()).toHaveLength(2);
	});

	it.each([
		['INTERNAL', () => new Response('', { status: 502 }), t.error],
		['FORBIDDEN', () => mockError('FORBIDDEN'), sl.errors.FORBIDDEN],
	])('%s: the matching sentence, the choice kept', async (_code, answer, sentence) => {
		show({}, answer);

		choose(t.reason_fake);
		fireEvent.click(send());

		expect((await within(dialog()).findByRole('alert')).textContent).toBe(sentence);
		expect(send()).toHaveProperty('disabled', false);
	});

	it('a failed captcha stops before the request with its own sentence', async () => {
		auth.ensureSession.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'));
		const { posts } = show();

		choose(t.reason_scam);
		fireEvent.click(send());

		expect((await within(dialog()).findByRole('alert')).textContent).toBe(sl.errors.CAPTCHA_FAILED);
		expect(posts()).toHaveLength(0);
	});

	it('caps the note at 500 and shows the counter only in the last 50, announced at 50, 20 and 0', () => {
		show();
		const live = () => document.querySelector('[aria-live="polite"]')?.textContent;
		const hint = () => document.getElementById(note().getAttribute('aria-describedby')!)?.textContent;

		expect(note().getAttribute('maxlength')).toBe('500');
		fireEvent.change(note(), { target: { value: 'a'.repeat(449) } });
		expect(note().getAttribute('aria-describedby')).toBeNull();
		expect(live()).toBe('');
		fireEvent.change(note(), { target: { value: 'a'.repeat(450) } });
		expect(hint()).toBe('Še 50 znakov');
		expect(live()).toBe('Še 50 znakov');
		fireEvent.change(note(), { target: { value: 'a'.repeat(451) } });
		expect(hint()).toBe('Še 49 znakov');
		expect(live()).toBe('Še 50 znakov');
		// A paste past 20 is announced once, with what is left.
		fireEvent.change(note(), { target: { value: 'a'.repeat(497) } });
		expect(hint()).toBe('Še 3 znaki');
		expect(live()).toBe('Še 3 znaki');
		fireEvent.change(note(), { target: { value: 'a'.repeat(500) } });
		expect(live()).toBe('Še 0 znakov');
	});

	it('a message with onBlock: the switch (on for "Prijavi in blokiraj"), the block after the report', async () => {
		const onBlock = vi.fn().mockResolvedValue(undefined);
		const onSent = vi.fn();
		const { posts } = show({ target: MESSAGE, onBlock, defaultBlock: true, onSent });

		expect(within(dialog()).getByText(t.target_message)).toBeTruthy();
		const toggle = within(dialog()).getByRole('switch', { name: t.block_label });
		expect(toggle.getAttribute('aria-checked')).toBe('true');
		expect(document.getElementById(toggle.getAttribute('aria-describedby')!)?.textContent).toBe(t.block_help);

		choose(t.reason_scam);
		fireEvent.click(send());

		expect(await within(dialog()).findByText(t.done_blocked)).toBeTruthy();
		expect(posts()[0]?.body).toMatchObject({ target_type: 'message', target_id: MESSAGE.id });
		expect(onBlock).toHaveBeenCalledOnce();
		expect(onSent).toHaveBeenCalledWith({ blocked: true });
	});

	it('the switch off, or a failed block: the report is thanked without "Oseba je blokirana."', async () => {
		const onBlock = vi.fn().mockRejectedValue(new Error('block failed'));
		show({ target: { type: 'profile', id: 'p-1' }, onBlock, defaultBlock: true });

		expect(within(dialog()).getByText(t.target_profile)).toBeTruthy();
		choose(t.reason_spam);
		fireEvent.click(send());

		expect(await within(dialog()).findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(within(dialog()).queryByText(t.done_blocked)).toBeNull();

		cleanup();
		show({ target: MESSAGE, onBlock });
		fireEvent.click(within(dialog()).getByRole('switch', { name: t.block_label }));
		fireEvent.click(within(dialog()).getByRole('switch', { name: t.block_label }));
		choose(t.reason_spam);
		fireEvent.click(send());
		expect(await within(dialog()).findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(onBlock).toHaveBeenCalledOnce();
	});

	it('is localised in EN, the rate-limit note included', async () => {
		show({}, () => mockError('RATE_LIMITED'), 'en');

		expect(within(dialog()).getByRole('heading', { name: en.abuse.title })).toBeTruthy();
		expect(within(dialog()).getByText('Rex').closest('p')?.textContent).toBe('About: Rex');
		fireEvent.click(within(dialog()).getByRole('radio', { name: en.abuse.reason_scam }));
		fireEvent.click(within(dialog()).getByRole('button', { name: en.abuse.send }));
		expect((await within(dialog()).findByRole('status')).textContent).toBe(en.abuse.rate_limited);
	});

	it('Escape and "Prekliči" close it and return focus to the opener', async () => {
		const { opener } = show();

		fireEvent.keyDown(note(), { key: 'Escape' });
		expect(screen.queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(opener));

		fireEvent.click(opener);
		fireEvent.click(within(dialog()).getByRole('button', { name: t.cancel }));
		expect(screen.queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(opener));
	});

	it.each(['textbox', 'switch', 'radio'] as const)(
		'inside another dialog, Escape on its %s closes only the abuse dialog',
		(role) => {
			stores.current = createApiStore(createMockApi());
			function Conversation() {
				const [open, setOpen] = React.useState(true);
				const [abuse, setAbuse] = React.useState(true);
				return (
					<DialogPrimitive.Root open={open} onOpenChange={setOpen}>
						<DialogPrimitive.Portal>
							<DialogPrimitive.Content aria-describedby={undefined}>
								<DialogPrimitive.Title>Conversation</DialogPrimitive.Title>
								<ReportAbuseDialog
									target={MESSAGE}
									onBlock={vi.fn()}
									open={abuse}
									onOpenChange={setAbuse}
								/>
							</DialogPrimitive.Content>
						</DialogPrimitive.Portal>
					</DialogPrimitive.Root>
				);
			}
			render(
				<NextIntlClientProvider locale="sl" messages={sl}>
					<Conversation />
				</NextIntlClientProvider>
			);
			const control = within(screen.getByRole('dialog', { name: t.title })).getAllByRole(role)[0]!;

			act(() => control.focus());
			fireEvent.keyDown(control, { key: 'Escape' });

			expect(screen.queryByRole('dialog', { name: t.title })).toBeNull();
			expect(screen.getByRole('dialog', { name: 'Conversation' })).toBeTruthy();
		}
	);
});

describe('Slot C "Več možnosti" (P9 S2)', () => {
	it('opens the abuse dialog from the menu with the client copy the detail page sends, focus back on the button', async () => {
		stores.current = createApiStore(createMockApi({ 'POST /v1/abuse-reports': abuseCreated }));
		const { common, consent, errors, nav, abuse } = sl;
		const { more, more_abuse } = sl.report;
		const onError = vi.fn();
		render(
			<NextIntlClientProvider
				locale="sl"
				messages={{ common, consent, errors, nav, abuse, report: { more, more_abuse } }}
				onError={onError}
			>
				<MoreMenu target={REPORT} />
			</NextIntlClientProvider>
		);
		const button = screen.getByRole('button', { name: more });
		expect(button.getAttribute('aria-haspopup')).toBe('menu');

		fireEvent.keyDown(button, { key: 'Enter' });
		const menu = await screen.findByRole('menu', { name: more });
		fireEvent.click(within(menu).getByRole('menuitem', { name: more_abuse }));

		const heading = await screen.findByRole('heading', { name: t.title });
		expect(document.activeElement).toBe(heading);
		expect(screen.getByText('Rex').closest('p')?.textContent).toBe('Glede objave: Rex');
		expect(auth.ensureSession).not.toHaveBeenCalled();

		choose(t.reason_scam);
		fireEvent.click(send());
		expect(await screen.findByRole('heading', { name: t.done_title })).toBeTruthy();
		expect(onError).not.toHaveBeenCalled();

		fireEvent.click(within(dialog()).getByRole('button', { name: t.done_close }));
		expect(screen.queryByRole('dialog')).toBeNull();
		await waitFor(() => expect(document.activeElement).toBe(button));
	});
});
