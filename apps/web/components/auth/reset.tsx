'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';

import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { loadAuth, MIN_PASSWORD, passwordTooLong, validEmail } from '@/lib/auth-light';

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
	// api.js loads with the first send, not on the page's first load (TASK-9.9).
	const captcha = useCaptcha({ lazy: true });
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
			const [{ requestPasswordReset }, captchaToken] = await Promise.all([loadAuth(), captcha.getToken()]);
			await requestPasswordReset(address, locale, captchaToken);
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
 * keeps the user signed in. `set` (C7 §6): the first password of a converted finder, whose address the link has just
 * confirmed; done, on to `next` (the step that offered the account).
 */
export function NewPasswordForm({ email, set = false, next }: { email: string; set?: boolean; next?: string }) {
	const t = useTranslations('auth');
	const tc = useTranslations('common');
	const errorText = useErrorText();
	const [password, setPassword] = React.useState('');
	const [problem, setProblem] = React.useState<'error_password_short' | 'error_password_long'>();
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);
	const [done, setDone] = React.useState(false);
	const passwordRef = React.useRef<HTMLInputElement>(null);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		const issue =
			password.length < MIN_PASSWORD
				? 'error_password_short'
				: passwordTooLong(password)
					? 'error_password_long'
					: undefined;
		setProblem(issue);
		if (issue) {
			passwordRef.current?.focus();
			return;
		}
		setBusy(true);
		setError(undefined);
		try {
			const { updatePassword } = await loadAuth();
			await updatePassword(password);
			setDone(true);
		} catch (failure) {
			setError(errorText(failure));
		} finally {
			setBusy(false);
		}
	};

	const title = t(set ? 'setpass_title' : 'newpass_title');
	if (done)
		return (
			<>
				<AuthHeading focus>{title}</AuthHeading>
				<AuthNote icon={CheckCircleIcon} className="mt-8">
					{t(set ? 'setpass_done' : 'newpass_done')}
				</AuthNote>
				<Button asChild size="lg" className="mt-8 w-full">
					{/* `next` is already a localised path (safeNext on the page). */}
					{next ? <NextLink href={next}>{tc('continue')}</NextLink> : <Link href="/">{tc('continue')}</Link>}
				</Button>
			</>
		);

	return (
		<>
			<AuthHeading>{title}</AuthHeading>
			{set && <p className="mt-3 text-lg leading-7">{t('setpass_body')}</p>}
			<form noValidate onSubmit={submit} className="mt-8">
				<input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
				<PasswordField
					ref={passwordRef}
					name="new-password"
					label={t('newpass_label')}
					hint={t('password_hint')}
					error={problem && t(problem)}
					large
					autoComplete="new-password"
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
						setProblem(undefined);
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
