'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { mfa } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

import { adminH1Class, ErrorNote } from './directory/parts';

type Step =
	| { kind: 'loading' }
	| { kind: 'failed'; error: unknown }
	| { kind: 'challenge'; factorId: string }
	| { kind: 'enrol'; factorId: string; qr: string; secret: string };

/** "JBSWY3DPEHPK3PXP" → "JBSW Y3DP EHPK 3PXP", easier to type into an app. */
const groupKey = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/**
 * P19 strong authentication (FR-019): staff with a verified TOTP factor enter its code (F7); staff without one enrol
 * first with the QR code or the key (A1), and the first code confirms the factor. Verifying raises the session to
 * aal2, and the shell shows the console once GET /v1/me reports it.
 */
export function Mfa() {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const tErrors = useTranslations('errors');
	const [attempt, setAttempt] = React.useState(0);
	const [step, setStep] = React.useState<Step>({ kind: 'loading' });
	const [code, setCode] = React.useState('');
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);
	const input = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			const { totp, all } = await mfa.listFactors();
			if (cancelled) return;
			const verified = totp.find((factor) => factor.status === 'verified');
			if (verified) return setStep({ kind: 'challenge', factorId: verified.id });
			// An enrolment that was never confirmed (tab closed) still counts against the factor limit.
			for (const factor of all)
				if (factor.factor_type === 'totp' && factor.status === 'unverified') await mfa.unenroll(factor.id);
			const factor = await mfa.enroll();
			if (!cancelled)
				setStep({ kind: 'enrol', factorId: factor.id, qr: factor.totp.qr_code, secret: factor.totp.secret });
		})().catch((failure: unknown) => {
			if (!cancelled) setStep({ kind: 'failed', error: failure });
		});
		return () => {
			cancelled = true;
		};
	}, [attempt]);

	React.useEffect(() => {
		if (step.kind === 'challenge' || step.kind === 'enrol') input.current?.focus();
	}, [step.kind]);

	const message = (failure: unknown) => {
		const errorCode = failure instanceof ApiError ? failure.code : 'INTERNAL';
		return tErrors(errorCode === 'RATE_LIMITED' ? 'RATE_LIMITED_generic' : errorCode);
	};

	if (step.kind === 'loading')
		return (
			<p role="status" className="sr-only">
				{tCommon('loading')}
			</p>
		);
	if (step.kind === 'failed')
		return (
			<>
				<h1 className={adminH1Class}>{t('mfa_title')}</h1>
				<div className="mt-8">
					<ErrorNote
						action={
							<Button
								variant="text"
								size="sm"
								className="mt-1 -ml-3"
								onClick={() => {
									setStep({ kind: 'loading' });
									setAttempt(attempt + 1);
								}}
							>
								{t('retry')}
							</Button>
						}
					>
						{message(step.error)}
					</ErrorNote>
				</div>
			</>
		);

	const enrol = step.kind === 'enrol';
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		const digits = code.replace(/\s/g, '');
		if (!/^\d{6}$/.test(digits)) {
			setError(t('mfa_wrong'));
			input.current?.focus();
			return;
		}
		setBusy(true);
		setError(undefined);
		try {
			// Stays busy on success: the console replaces this screen when the session is aal2.
			await mfa.challengeAndVerify(step.factorId, digits);
		} catch (failure) {
			setBusy(false);
			setError(failure instanceof ApiError && failure.code === 'VALIDATION' ? t('mfa_wrong') : message(failure));
			input.current?.focus();
		}
	};

	return (
		<>
			<h1 className={adminH1Class}>{t(enrol ? 'enrol_title' : 'mfa_title')}</h1>
			<p className="mt-3">{t(enrol ? 'enrol_body' : 'mfa_body')}</p>
			{enrol && (
				<div className="mt-8 flex flex-wrap items-center gap-6">
					{/* Dark modules on a light field in both modes, so every scanner reads it. */}
					<div className="grid size-42 shrink-0 place-items-center rounded-row bg-card dark:bg-foreground">
						{/* eslint-disable-next-line @next/next/no-img-element -- Supabase's SVG data URL, nothing to optimise */}
						<img src={step.qr} alt={t('enrol_qr_alt')} width={148} height={148} />
					</div>
					<div className="min-w-0">
						<p className="text-control font-bold">{t('enrol_key')}</p>
						<p className="mt-2 text-lg font-bold tracking-[0.06em] break-all tabular-nums select-all">
							{groupKey(step.secret)}
						</p>
					</div>
				</div>
			)}
			<form noValidate onSubmit={submit} className="mt-8 grid gap-8">
				<FormField label={t(enrol ? 'enrol_code' : 'mfa_label')} error={error}>
					<Input
						ref={input}
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={7}
						value={code}
						onChange={(event) => setCode(event.target.value)}
						className="min-h-16 font-bold tracking-[0.32em] tabular-nums"
					/>
				</FormField>
				<Button type="submit" size="lg" className="w-full" loading={busy}>
					{t(enrol ? 'enrol_submit' : 'mfa_submit')}
				</Button>
			</form>
		</>
	);
}
