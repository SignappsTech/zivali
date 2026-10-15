'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { MIN_PASSWORD, requestPasswordReset, updatePassword, validEmail } from '@/lib/auth';

import { AuthHeading, AuthNote, PasswordField, useCooldown, useErrorText } from './parts';
import { useCaptcha } from './turnstile';

/**
 * P16 M6, M7 forgot password: one question. The answer is the same whether or not the address has an account; only
 * the rate limit (E3), a failed captcha and network errors are told apart, and none of them depends on the account.
 */
export function ForgotForm({ email: initialEmail = '', expired = false }: { email?: string; expired?: boolean }) {
	const t = useTranslations('auth');
	const te = useTranslations('errors');
	const locale = useLocale();
	const errorText = useErrorText();
	const captcha = useCaptcha();
	const limited = useCooldown();
	const [email, setEmail] = React.useState(initialEmail);
	const [invalid, setInvalid] = React.useState(false);
	const [result, setResult] = React.useState<'sent' | 'captcha' | { error: string }>();
	const [busy, setBusy] = React.useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy || limited.active) return;
		const address = email.trim();
		setInvalid(!validEmail(address));
		if (!validEmail(address)) return;
		setBusy(true);
		setResult(undefined);
		try {
			await requestPasswordReset(address, locale, await captcha.getToken());
			setResult('sent');
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			if (code === 'RATE_LIMITED') limited.start();
			else setResult(code === 'CAPTCHA_FAILED' ? 'captcha' : { error: errorText(failure) });
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<AuthHeading>{t('forgot_title')}</AuthHeading>
			<p className="mt-3 text-lg leading-7">{t('forgot_body')}</p>
			{expired && (
				<AuthNote icon={LinkBreakIcon} className="mt-6">
					<b>{t('link_failed_title')}</b> {t('link_failed_body')}
				</AuthNote>
			)}
			<form noValidate onSubmit={submit} className="mt-8">
				<FormField label={t('email_label')} error={invalid ? t('error_email_invalid') : undefined}>
					<Input
						type="email"
						name="email"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="none"
						spellCheck={false}
						className="min-h-16"
						value={email}
						onChange={(event) => {
							setEmail(event.target.value);
							setInvalid(false);
						}}
					/>
				</FormField>
				{limited.active ? (
					<AuthNote icon={ClockIcon} className="mt-8">
						{t('error_rate_limited')}
					</AuthNote>
				) : result === 'sent' ? (
					<AuthNote icon={EnvelopeSimpleIcon} className="mt-8">
						{t('forgot_done')}
					</AuthNote>
				) : result === 'captcha' ? (
					<AuthNote icon={ShieldWarningIcon} className="mt-8">
						{te('CAPTCHA_FAILED')}
					</AuthNote>
				) : result ? (
					<FieldError className="mt-4">{result.error}</FieldError>
				) : null}
				{captcha.widget}
				<Button type="submit" size="lg" className="mt-8 w-full" loading={busy} disabled={limited.active}>
					{t('forgot_button')}
				</Button>
			</form>
			<Button asChild variant="text" className="mt-4 w-full">
				<Link href={{ pathname: '/sign-in', query: email.trim() ? { email: email.trim() } : {} }}>
					{t('signin_button')}
				</Link>
			</Button>
		</>
	);
}

/**
 * P16 M8 new password. The page renders it only for a session from a reset link (lib/viewer.ts recoveryEmail, on
 * the server). The hidden username field lets password managers save the new password to the right entry. Saving
 * keeps the user signed in.
 */
export function NewPasswordForm({ email }: { email: string }) {
	const t = useTranslations('auth');
	const tc = useTranslations('common');
	const errorText = useErrorText();
	const [password, setPassword] = React.useState('');
	const [short, setShort] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);
	const [done, setDone] = React.useState(false);
	const passwordRef = React.useRef<HTMLInputElement>(null);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setShort(password.length < MIN_PASSWORD);
		if (password.length < MIN_PASSWORD) {
			passwordRef.current?.focus();
			return;
		}
		setBusy(true);
		setError(undefined);
		try {
			await updatePassword(password);
			setDone(true);
		} catch (failure) {
			setError(errorText(failure));
		} finally {
			setBusy(false);
		}
	};

	if (done)
		return (
			<>
				<AuthHeading focus>{t('newpass_title')}</AuthHeading>
				<AuthNote icon={CheckCircleIcon} className="mt-8">
					{t('newpass_done')}
				</AuthNote>
				<Button asChild size="lg" className="mt-8 w-full">
					<Link href="/">{tc('continue')}</Link>
				</Button>
			</>
		);

	return (
		<>
			<AuthHeading>{t('newpass_title')}</AuthHeading>
			<form noValidate onSubmit={submit} className="mt-8">
				<input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
				<PasswordField
					ref={passwordRef}
					name="new-password"
					label={t('newpass_label')}
					hint={t('password_hint')}
					error={short ? t('error_password_short') : undefined}
					large
					autoComplete="new-password"
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
						setShort(false);
					}}
				/>
				{error && <FieldError className="mt-4">{error}</FieldError>}
				<Button type="submit" size="lg" className="mt-8 w-full" loading={busy}>
					{t('newpass_button')}
				</Button>
			</form>
		</>
	);
}
