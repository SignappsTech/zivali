import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, render, within } from '@testing-library/react-native';
import * as React from 'react';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import { ApiError } from '@zivali/api/client';
import { createMockApi, type MockHandler, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { type AbuseTarget, ReportAbuse } from '@/components/abuse/report-abuse';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ensureSession } from '@/lib/anonymous';

// The anonymous session has its own tests (manage.test.tsx); here it only has to come before the request.
jest.mock('@/lib/anonymous', () => ({ ensureSession: jest.fn(async () => ({})) }));

const a = sl.abuse;
const REPORT: AbuseTarget = { type: 'report', id: '7c1e4b2a-0000-4000-8000-000000000001', title: 'Rex' };
const MESSAGE: AbuseTarget = { type: 'message', id: '3e5a7c9b-0000-4000-8000-000000000001' };
const mockEnsureSession = jest.mocked(ensureSession);

async function open(
	handler: MockHandler,
	props: Partial<React.ComponentProps<typeof ReportAbuse>> & { target?: AbuseTarget } = {}
) {
	const api = createMockApi({ 'POST /v1/abuse-reports': handler });
	const onClose = jest.fn();
	await render(
		<Provider store={createApiStore(api)}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<Sheet open>
					<SheetContent closeLabel={sl.common.close}>
						<ReportAbuse target={REPORT} onClose={onClose} {...props} />
					</SheetContent>
				</Sheet>
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
	return { api, onClose };
}

const send = () => screen.getByRole('button', { name: a.send });
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));

beforeEach(() => mockEnsureSession.mockClear());

describe('report abuse sheet (P10 mobile)', () => {
	test('a listing: heading, target, the five reasons as one radio group, "Pošlji" disabled with its reason', async () => {
		await open(() => abuseCreated);

		expect(screen.getByRole('heading', { name: a.title })).toBeOnTheScreen();
		expect(screen.getByText('Glede objave: Rex')).toBeOnTheScreen();
		// A labelled container, not one screen-reader element, so not a getByRole target.
		const group = screen.getByLabelText(a.reason_label);
		expect(group.props.role).toBe('radiogroup');
		expect(within(group).getAllByRole('radio')).toHaveLength(5);
		for (const name of [a.reason_scam, a.reason_fake, a.reason_spam, a.reason_image, a.reason_other])
			expect(within(group).getByRole('radio', { name, checked: false })).toBeOnTheScreen();
		expect(screen.getByLabelText(a.note_label)).toBeOnTheScreen();
		// No block switch for a listing.
		expect(screen.queryByRole('switch')).toBeNull();

		expect(send()).toBeDisabled();
		expect(send().props.accessibilityHint).toBe(a.send_disabled_help);
		expect(screen.getByText(a.send_disabled_help)).toBeOnTheScreen();
		expect(screen.getByText(a.privacy)).toBeOnTheScreen();
	});

	test('reason and note: anonymous session first, then the C11 request; the confirmation replaces the form', async () => {
		const { api, onClose } = await open(() => abuseCreated);

		await choose(a.reason_scam);
		expect(screen.getByRole('radio', { name: a.reason_scam, checked: true })).toBeOnTheScreen();
		expect(screen.queryByText(a.send_disabled_help)).toBeNull();
		expect(send()).toBeEnabled();
		await fireEvent.changeText(screen.getByLabelText(a.note_label), '  Asks for money upfront  ');
		await fireEvent.press(send());

		expect(await screen.findByRole('heading', { name: a.done_title })).toBeOnTheScreen();
		expect(mockEnsureSession).toHaveBeenCalledTimes(1);
		expect(api.calls.map((call) => call.body)).toEqual([
			{ target_type: 'report', target_id: REPORT.id, reason: 'scam', note: 'Asks for money upfront' },
		]);
		expect(screen.getByText(a.done_body)).toBeOnTheScreen();
		expect(screen.queryByText(a.done_blocked)).toBeNull();
		expect(screen.queryByRole('button', { name: a.send })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: a.done_close }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test('an empty note is left out; a duplicate gets the same confirmation (AC 2)', async () => {
		const onSent = jest.fn();
		const { api } = await open(() => ({ id: abuseCreated.id, duplicate: true }), { onSent });

		await choose(a.reason_fake);
		await fireEvent.changeText(screen.getByLabelText(a.note_label), '   ');
		await fireEvent.press(send());

		expect(await screen.findByRole('heading', { name: a.done_title })).toBeOnTheScreen();
		expect(screen.getByText(a.done_body)).toBeOnTheScreen();
		expect(api.calls[0]!.body).toEqual({ target_type: 'report', target_id: REPORT.id, reason: 'fake' });
		expect(onSent).toHaveBeenCalledWith({ blocked: false });
	});

	test('the note counter shows only in the last 50 of 500 characters', async () => {
		await open(() => abuseCreated);
		const note = screen.getByLabelText(a.note_label);
		expect(note.props.maxLength).toBe(500);

		await fireEvent.changeText(note, 'x'.repeat(449));
		expect(screen.queryByText(/^Še \d+ znak/)).toBeNull();
		await fireEvent.changeText(note, 'x'.repeat(460));
		expect(screen.getByText('Še 40 znakov')).toBeOnTheScreen();
		await fireEvent.changeText(note, 'x'.repeat(498));
		expect(screen.getByText('Še 2 znaka')).toBeOnTheScreen();
	});

	test('rate limited: calm note, the choice kept, "Pošlji" disabled with the note as its reason (AC 3)', async () => {
		const { api } = await open(() => mockError('RATE_LIMITED'));

		await choose(a.reason_spam);
		await fireEvent.press(send());

		const note = await screen.findByRole('status');
		expect(note).toHaveTextContent(a.rate_limited);
		expect(screen.getByRole('radio', { name: a.reason_spam, checked: true })).toBeOnTheScreen();
		expect(send()).toBeDisabled();
		expect(send().props.accessibilityHint).toBe(a.rate_limited);
		expect(api.calls).toHaveLength(1);
	});

	test('a network error: inline alert, selection and note kept, "Pošlji" sends again', async () => {
		let attempts = 0;
		const { api } = await open(() => {
			attempts += 1;
			if (attempts === 1) throw new TypeError('Network request failed');
			return abuseCreated;
		});

		await choose(a.reason_image);
		await fireEvent.changeText(screen.getByLabelText(a.note_label), 'Slika ni ustrezna');
		await fireEvent.press(send());

		expect(await screen.findByRole('alert')).toHaveTextContent(a.error);
		expect(screen.getByRole('radio', { name: a.reason_image, checked: true })).toBeOnTheScreen();
		expect(screen.getByLabelText(a.note_label).props.value).toBe('Slika ni ustrezna');
		expect(send()).toBeEnabled();

		await fireEvent.press(send());
		expect(await screen.findByRole('heading', { name: a.done_title })).toBeOnTheScreen();
		expect(api.calls).toHaveLength(2);
	});

	test('a failed captcha before the anonymous sign-in says so in Slovenian; nothing is sent', async () => {
		mockEnsureSession.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'));
		const { api } = await open(() => abuseCreated);

		await choose(a.reason_other);
		await fireEvent.press(send());

		expect(await screen.findByRole('alert')).toHaveTextContent(sl.errors.CAPTCHA_FAILED);
		expect(api.calls).toHaveLength(0);
	});

	test('offline: "Pošlji" disabled with the reason shown, the choice stays for later', async () => {
		const { api } = await open(() => abuseCreated, { offline: true });

		await choose(a.reason_scam);
		expect(screen.getByRole('status')).toHaveTextContent(sl.report.action_offline);
		expect(send()).toBeDisabled();
		expect(send().props.accessibilityHint).toBe(sl.report.action_offline);
		expect(api.calls).toHaveLength(0);
	});

	test('a chat message: its target line and the block switch; blocked after the report (reusable from P12)', async () => {
		const onBlock = jest.fn(async () => {});
		const onSent = jest.fn();
		const { api } = await open(() => abuseCreated, { target: MESSAGE, onBlock, defaultBlock: true, onSent });

		expect(screen.getByText(a.target_message)).toBeOnTheScreen();
		const block = screen.getByRole('switch', { name: a.block_label });
		expect(block.props.accessibilityHint).toBe(a.block_help);
		expect(block).toBeChecked();

		await choose(a.reason_scam);
		await fireEvent.press(send());

		expect(await screen.findByText(a.done_blocked)).toBeOnTheScreen();
		expect(api.calls[0]!.body).toEqual({ target_type: 'message', target_id: MESSAGE.id, reason: 'scam' });
		expect(onBlock).toHaveBeenCalledTimes(1);
		expect(onSent).toHaveBeenCalledWith({ blocked: true });
	});

	test('the switch turned on blocks after the report; a failed block still thanks, without "blokirana"', async () => {
		const onBlock = jest.fn(async () => {
			throw new ApiError('NETWORK', 'NETWORK');
		});
		await open(() => abuseCreated, { target: MESSAGE, onBlock });

		await fireEvent.press(screen.getByRole('switch', { name: a.block_label }));
		await choose(a.reason_spam);
		await fireEvent.press(send());

		expect(await screen.findByRole('heading', { name: a.done_title })).toBeOnTheScreen();
		expect(onBlock).toHaveBeenCalledTimes(1);
		expect(screen.queryByText(a.done_blocked)).toBeNull();
	});
});
