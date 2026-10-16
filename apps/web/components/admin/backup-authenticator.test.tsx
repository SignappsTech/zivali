import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import { BackupAuthenticator } from './backup-authenticator';

const a = sl.admin;

const mfa = vi.hoisted(() => ({
	listFactors: vi.fn(),
	unenroll: vi.fn(),
	enroll: vi.fn(),
	challengeAndVerify: vi.fn(),
}));
vi.mock('@zivali/api/auth', () => ({ mfa }));

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const show = () =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<BackupAuthenticator />
		</NextIntlClientProvider>
	);

describe('BackupAuthenticator (TASK-34.6)', () => {
	it('enrols a second TOTP factor: clears a stale unverified one, shows the key, confirms with a code', async () => {
		mfa.listFactors.mockResolvedValue({
			totp: [{ id: 'f-1', status: 'verified' }],
			all: [
				{ id: 'f-1', factor_type: 'totp', status: 'verified' },
				{ id: 'f-old', factor_type: 'totp', status: 'unverified' },
			],
		});
		mfa.unenroll.mockResolvedValue({});
		mfa.enroll.mockResolvedValue({
			id: 'f-2',
			totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'JBSWY3DPEHPK3PXP' },
		});
		mfa.challengeAndVerify.mockResolvedValue({});
		show();

		fireEvent.click(await screen.findByRole('button', { name: a.backup_add }));
		expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeTruthy();
		expect(mfa.unenroll).toHaveBeenCalledWith('f-old');
		expect(mfa.unenroll).not.toHaveBeenCalledWith('f-1');

		fireEvent.change(screen.getByLabelText(a.enrol_code), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: a.backup_confirm }));
		await waitFor(() => expect(mfa.challengeAndVerify).toHaveBeenCalledWith('f-2', '123456'));
		expect(await screen.findByText(a.backup_done)).toBeTruthy();
	});

	it('rejects a malformed code without calling Auth', async () => {
		mfa.listFactors.mockResolvedValue({ totp: [{ id: 'f-1', status: 'verified' }], all: [] });
		mfa.enroll.mockResolvedValue({ id: 'f-2', totp: { qr_code: 'x', secret: 'ABCD' } });
		show();

		fireEvent.click(await screen.findByRole('button', { name: a.backup_add }));
		fireEvent.change(await screen.findByLabelText(a.enrol_code), { target: { value: '12' } });
		fireEvent.click(screen.getByRole('button', { name: a.backup_confirm }));
		expect(await screen.findByText(a.mfa_wrong)).toBeTruthy();
		expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
	});

	it('says it is set up once two verified factors exist, with no add button', async () => {
		mfa.listFactors.mockResolvedValue({
			totp: [
				{ id: 'f-1', status: 'verified' },
				{ id: 'f-2', status: 'verified' },
			],
			all: [],
		});
		show();
		expect(await screen.findByText(a.backup_done)).toBeTruthy();
		expect(screen.queryByRole('button', { name: a.backup_add })).toBeNull();
	});
});
