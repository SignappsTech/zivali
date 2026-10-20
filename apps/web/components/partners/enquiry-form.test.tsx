import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { PageMessages } from '@/components/page-messages';
import { clientMessages, regionOptions } from '@/lib/partners';

import { EnquiryForm } from './enquiry-form';

const catalogues = { sl, en };

// The Radix checkbox measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

// As the page composes it: the islands see the shell namespaces plus clientMessages(partners), nothing more.
function show(locale: 'sl' | 'en' = 'sl') {
	return render(
		<NextIntlClientProvider locale={locale} messages={catalogues[locale]}>
			<PageMessages messages={{ partners: clientMessages(catalogues[locale].partners) }}>
				<EnquiryForm regions={regionOptions(locale)} />
			</PageMessages>
		</NextIntlClientProvider>
	);
}

const p = sl.partners;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: p.form_submit }));
const json = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fillValid() {
	type(p.form_company, 'Veterinarska ambulanta Primer');
	type(p.form_name, 'Ana Novak');
	type(p.form_email, 'ana@primer.si');
	type(p.form_message, 'Zanima nas mesto na strani prijave.');
	fireEvent.click(screen.getByRole('checkbox', { name: p.form_consent }));
}

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
	fetchMock.mockResolvedValue(json(201, { id: 'a1e5f00d-0000-4000-8000-000000000001' }));
	vi.stubGlobal('fetch', fetchMock);
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('P22 enquiry form', () => {
	it('starts empty with consent not ticked, visible labels and autocomplete for name and email', () => {
		show();

		expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(p.form_title);
		expect(screen.getByRole('checkbox', { name: p.form_consent }).getAttribute('aria-checked')).toBe('false');
		expect(screen.getByLabelText(p.form_company).getAttribute('autocomplete')).toBe('organization');
		expect(screen.getByLabelText(p.form_name).getAttribute('autocomplete')).toBe('name');
		expect(screen.getByLabelText(p.form_email).getAttribute('autocomplete')).toBe('email');
		expect((screen.getByLabelText(p.form_interest) as HTMLSelectElement).value).toBe('unsure');
		expect((screen.getByLabelText(p.form_region) as HTMLSelectElement).options).toHaveLength(13);
		expect(screen.getByRole('link', { name: 'politiki zasebnosti' }).getAttribute('href')).toBe('/zasebnost');
	});

	it('shows every error under its field, focuses the first and sends nothing', () => {
		show();
		submit();

		for (const error of [p.err_company, p.err_name, p.err_email, p.err_message, p.err_consent])
			expect(screen.getByText(error)).toBeTruthy();
		expect(screen.queryByText(p.err_phone)).toBeNull();
		expect(document.activeElement).toBe(screen.getByLabelText(p.form_company));
		expect(screen.getByLabelText(p.form_company).getAttribute('aria-invalid')).toBe('true');
		expect(screen.getByRole('checkbox', { name: p.form_consent }).getAttribute('aria-describedby')).toBe(
			'enquiry-consent-error'
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('checks the email, the phone and the message length, then clears the errors live', () => {
		show();
		fillValid();
		type(p.form_email, 'ana@');
		type(p.form_phone, 'pokliči me');
		type(p.form_message, 'x'.repeat(2001));
		submit();

		expect(screen.getByText(p.err_email)).toBeTruthy();
		expect(screen.getByText(p.err_phone)).toBeTruthy();
		expect(screen.getByText(p.err_message_long)).toBeTruthy();
		expect(document.activeElement).toBe(screen.getByLabelText(p.form_email));

		type(p.form_email, 'ana@primer.si');
		type(p.form_phone, '+386 41 123 456');
		expect(screen.queryByText(p.err_email)).toBeNull();
		expect(screen.queryByText(p.err_phone)).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends the lead with consent and the captcha token, disables the fields while sending, then confirms', async () => {
		let answer!: (response: Response) => void;
		fetchMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		show();
		fillValid();
		fireEvent.change(screen.getByLabelText(p.form_interest), { target: { value: 'vet_partner' } });
		fireEvent.change(screen.getByLabelText(p.form_region), { target: { value: 'podravska' } });
		submit();

		const sending = await screen.findByRole('button', { name: p.form_sending });
		expect(sending.getAttribute('aria-busy')).toBe('true');
		expect((screen.getByLabelText(p.form_company) as HTMLInputElement).disabled).toBe(true);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('http://localhost:4000/v1/leads');
		expect(init?.method).toBe('POST');
		expect(JSON.parse(init!.body as string)).toEqual({
			company: 'Veterinarska ambulanta Primer',
			contact_name: 'Ana Novak',
			email: 'ana@primer.si',
			region_interest: 'podravska',
			interest: 'vet_partner',
			message: 'Zanima nas mesto na strani prijave.',
			consent: true,
			captcha_token: 'captcha-off',
			locale: 'sl',
		});

		await act(async () => answer(json(201, { id: 'x' })));
		const status = screen.getByRole('status');
		expect(status.textContent).toContain(p.success_title);
		expect(status.textContent).toContain('Odgovorili vam bomo na ana@primer.si.');
		expect(document.activeElement).toBe(screen.getByRole('heading', { name: p.success_title }));
		expect(screen.getByRole('link', { name: p.success_back }).getAttribute('href')).toBe('#main');
		expect(document.querySelector('form')).toBeNull();
	});

	it.each([
		[429, 'RATE_LIMITED', p.limited, 'status'],
		[422, 'CAPTCHA_FAILED', p.captcha_failed, 'alert'],
		[500, 'INTERNAL', p.server_error, 'alert'],
	] as const)('answers %i %s with a calm note and keeps the data', async (status, code, text, role) => {
		fetchMock.mockResolvedValueOnce(json(status, { error: { code, message: code } }));
		show();
		fillValid();
		submit();

		expect((await screen.findByRole(role)).textContent).toBe(text);
		expect((screen.getByLabelText(p.form_company) as HTMLInputElement).value).toBe('Veterinarska ambulanta Primer');
		expect(screen.getByRole('checkbox', { name: p.form_consent }).getAttribute('aria-checked')).toBe('true');

		// The same button retries.
		submit();
		expect(await screen.findByText(p.success_title)).toBeTruthy();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('answers a dropped connection with the server error note', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		show();
		fillValid();
		submit();

		expect((await screen.findByRole('alert')).textContent).toBe(p.server_error);
	});

	it('speaks English on /en/advertise', () => {
		show('en');
		fireEvent.click(screen.getByRole('button', { name: en.partners.form_submit }));

		expect(screen.getByText(en.partners.err_consent)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'privacy policy' }).getAttribute('href')).toBe('/en/privacy');
		expect(screen.getByRole('option', { name: 'Upper Carniola' })).toBeTruthy();
	});
});

describe('P22 enquiry form analytics (C12b partner_enquiry)', () => {
	const form = { name: 'flow_step', params: { flow: 'partner_enquiry', step: 'form' } };
	const refused = (code: string, field?: string) => ({
		name: 'flow_error',
		params: { flow: 'partner_enquiry', step: 'form', error_code: code, ...(field && { error_field: field }) },
	});

	it('sends form once on the first interaction and one flow_error per refused submit with the first field', () => {
		show();
		fireEvent.focus(screen.getByLabelText(p.form_company));
		fireEvent.focus(screen.getByLabelText(p.form_name));
		expect(getMockEvents()).toEqual([form]);

		submit();
		fillValid();
		type(p.form_email, 'ana@');
		type(p.form_phone, 'pokliči me');
		submit();
		type(p.form_email, '');
		submit();
		type(p.form_email, 'ana@primer.si');
		submit();
		type(p.form_phone, '');
		type(p.form_message, 'x'.repeat(2001));
		submit();

		expect(getMockEvents()).toEqual([
			form,
			refused('required', 'company'),
			refused('invalid', 'email'),
			refused('required', 'email'),
			refused('invalid', 'phone'),
			refused('too_long', 'message'),
		]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends form on a submit without an earlier focus, and the consent box as its own field', () => {
		show();
		type(p.form_company, 'Veterinarska ambulanta Primer');
		type(p.form_name, 'Ana Novak');
		type(p.form_email, 'ana@primer.si');
		type(p.form_message, 'Zanima nas mesto na strani prijave.');
		submit();

		expect(getMockEvents()).toEqual([form, refused('required', 'consent')]);
	});

	it('sends generate_lead with the interest on success, never what was typed', async () => {
		show();
		fillValid();
		type(p.form_phone, '+386 41 123 456');
		fireEvent.change(screen.getByLabelText(p.form_interest), { target: { value: 'vet_partner' } });
		submit();
		await screen.findByText(p.success_title);

		expect(getMockEvents()).toEqual([form, { name: 'generate_lead', params: { lead_type: 'vet_partner' } }]);
		const sent = JSON.stringify(getMockEvents());
		for (const value of ['Primer', 'Ana', 'ana@primer.si', '386', 'Zanima']) expect(sent).not.toContain(value);
	});

	it.each([
		['RATE_LIMITED', () => json(429, { error: { code: 'RATE_LIMITED', message: 'x' } })],
		['CAPTCHA_FAILED', () => json(422, { error: { code: 'CAPTCHA_FAILED', message: 'x' } })],
		['NETWORK', () => Promise.reject(new TypeError('Failed to fetch'))],
	] as const)('sends one flow_error %s per refused send', async (code, answer) => {
		fetchMock.mockImplementationOnce(async () => answer());
		show();
		fillValid();
		submit();
		await screen.findByText(
			code === 'RATE_LIMITED' ? p.limited : code === 'CAPTCHA_FAILED' ? p.captcha_failed : p.server_error
		);

		expect(getMockEvents()).toEqual([form, refused(code)]);
	});

	it('records nothing without analytics consent', async () => {
		setConsent({ analytics: false });
		resetMockEvents();
		show();
		fireEvent.focus(screen.getByLabelText(p.form_company));
		submit();
		fillValid();
		submit();
		await screen.findByText(p.success_title);

		expect(getMockEvents()).toEqual([]);
	});
});
