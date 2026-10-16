'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { mfa } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

import { groupKey } from './mfa';

type State = 'loading' | 'ready' | 'done' | { factorId: string; qr: string; secret: string };

/**
 * Recovery for a lost device (TASK-34.6): Supabase TOTP has no backup codes, so a signed-in (aal2) admin enrols a
 * second TOTP factor. Shown on the dashboard until two verified factors exist.
 */
export function BackupAuthenticator() {
	const t = useTranslations('admin');
	const tErrors = useTranslations('errors');
	const [state, setState] = React.useState<State>('loading');
	const [code, setCode] = React.useState('');
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		let cancelled = false;
		mfa.listFactors()
			.then(({ totp }) => {
				if (!cancelled) setState(totp.filter((f) => f.status === 'verified').length > 1 ? 'done' : 'ready');
			})
			.catch(() => {
				if (!cancelled) setState('ready');
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const fail = (failure: unknown) => {
		const errorCode = failure instanceof ApiError ? failure.code : 'INTERNAL';
		setError(
			errorCode === 'VALIDATION'
				? t('mfa_wrong')
				: tErrors(errorCode === 'RATE_LIMITED' ? 'RATE_LIMITED_generic' : errorCode)
		);
	};
	const start = async () => {
		setBusy(true);
		setError(undefined);
		try {
			// A never-confirmed enrolment still counts against the factor limit.
			const { all } = await mfa.listFactors();
			for (const factor of all)
				if (factor.factor_type === 'totp' && factor.status === 'unverified') await mfa.unenroll(factor.id);
			const factor = await mfa.enroll();
			setState({ factorId: factor.id, qr: factor.totp.qr_code, secret: factor.totp.secret });
		} catch (failure) {
			fail(failure);
		}
		setBusy(false);
	};
	const confirm = async (event: React.FormEvent) => {
		event.preventDefault();
		if (typeof state !== 'object') return;
		const digits = code.replace(/\s/g, '');
		if (!/^\d{6}$/.test(digits)) return setError(t('mfa_wrong'));
		setBusy(true);
		setError(undefined);
		try {
			await mfa.challengeAndVerify(state.factorId, digits);
			setState('done');
		} catch (failure) {
			fail(failure);
		}
		setBusy(false);
	};

	if (state === 'loading') return null;
	return (
		<section aria-labelledby="backup-title" className="mt-12">
			<h2 id="backup-title" className="text-lg font-bold">
				{t('backup_title')}
			</h2>
			{state === 'done' ? (
				<p className="mt-3">{t('backup_done')}</p>
			) : (
				<>
					<p className="mt-3">{t('backup_body')}</p>
					{state === 'ready' ? (
						<>
							{error && (
								<p role="alert" className="mt-3 text-destructive">
									{error}
								</p>
							)}
							<Button className="mt-4" variant="secondary" loading={busy} onClick={start}>
								{t('backup_add')}
							</Button>
						</>
					) : (
						<>
							<div className="mt-6 flex flex-wrap items-center gap-6">
								<div className="grid size-42 shrink-0 place-items-center rounded-row bg-card dark:bg-foreground">
									{/* eslint-disable-next-line @next/next/no-img-element -- Supabase's SVG data URL, nothing to optimise */}
									<img src={state.qr} alt={t('enrol_qr_alt')} width={148} height={148} />
								</div>
								<div className="min-w-0">
									<p className="text-control font-bold">{t('enrol_key')}</p>
									<p className="mt-2 text-lg font-bold tracking-[0.06em] break-all tabular-nums select-all">
										{groupKey(state.secret)}
									</p>
								</div>
							</div>
							<form noValidate onSubmit={confirm} className="mt-6 grid gap-6">
								<FormField label={t('enrol_code')} error={error}>
									<Input
										inputMode="numeric"
										autoComplete="one-time-code"
										maxLength={7}
										value={code}
										onChange={(event) => setCode(event.target.value)}
										className="min-h-16 font-bold tracking-[0.32em] tabular-nums"
									/>
								</FormField>
								<Button type="submit" loading={busy}>
									{t('backup_confirm')}
								</Button>
							</form>
						</>
					)}
				</>
			)}
		</section>
	);
}
