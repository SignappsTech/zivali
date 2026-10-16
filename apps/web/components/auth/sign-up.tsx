'use client';

import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { TrayIcon } from '@phosphor-icons/react/dist/ssr/Tray';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { track } from '@zivali/analytics';
import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { convertAnonymous, MIN_PASSWORD, resendConfirmation, resendConversion, signUp, validEmail } from '@/lib/auth';

import { AuthHeading, AuthNote, PasswordField, ResendButton, Spot, useCooldown, useErrorText } from './parts';
import { ProviderButtons } from './provider-buttons';
import { useCaptcha } from './turnstile';

const inlineLink =
	'font-bold text-primary underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * P16 M4 "Preverite e-pošto": after sign-up (`sent`: resend starts cooling down) or a sign-in with an unconfirmed
 * address. Web has no "Odpri e-pošto", so "Pošlji znova" is the primary (P16 G2). `convert`: the link of a converted
 * anonymous session is an email change, sent again by setting the address again (C7 §6), back to `next`.
 */
export function CheckEmail({
	email,
	sent,
	onChange,
	convert = false,
	next,
}: {
	email: string;
	sent: boolean;
	onChange: () => void;
	convert?: boolean;
	next?: string;
}) {
	const t = useTranslations('auth');
	const locale = useLocale();

	return (
		<>
			<Spot>
				<EnvelopeSimpleIcon weight="bold" />
			</Spot>
			<AuthHeading focus>{t('check_title')}</AuthHeading>
			<p className="mt-3 text-lg leading-7 break-words">{t('check_body', { email })}</p>
			<p className="mt-5 flex gap-2 text-sm text-muted-foreground">
				<TrayIcon weight="bold" aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				<span>{t('check_spam')}</span>
			</p>
			<div className="mt-8 grid gap-1">
				<ResendButton
					primary
					label={t('check_resend')}
					coolingDown={sent}
					onResend={(captchaToken) =>
						convert
							? resendConversion(email, locale, next)
							: resendConfirmation(email, locale, captchaToken)
					}
				/>
				<Button variant="text" className="w-full" onClick={onChange}>
					{t('check_change')}
				</Button>
			</div>
		</>
	);
}

type Field = 'name' | 'email' | 'password';

/**
 * P16 W2 create account: name, email and password; checked on submit, then live per field (E2); terms as a sentence.
 * A taken address behaves like success (the check-email view), so the form never tells which addresses have an
 * account; Supabase answers a repeated sign-up the same way.
 *
 * `convert` (the server checked this browser has an anonymous finder session, C7 §6): the same form turns that session
 * into the account (convertAnonymous), so the reports made without one stay. GoTrue names a taken address here, so the
 * form says it and how to add the report to that account (sign in, then the private link); no providers (they would
 * start another user).
 */
export function SignUpForm({
	next,
	email: initialEmail = '',
	convert = false,
}: {
	next?: string;
	email?: string;
	convert?: boolean;
}) {
	const t = useTranslations('auth');
	const te = useTranslations('errors');
	const locale = useLocale();
	const errorText = useErrorText();
	const captcha = useCaptcha();
	const limited = useCooldown();
	const [values, setValues] = React.useState({ name: '', email: initialEmail, password: '' });
	const [submitted, setSubmitted] = React.useState(false);
	const [serverError, setServerError] = React.useState<{
		field?: Field;
		text: string;
		note?: 'limited' | 'captcha';
	}>();
	const [busy, setBusy] = React.useState(false);
	const [sentTo, setSentTo] = React.useState<string>();
	const nameRef = React.useRef<HTMLInputElement>(null);
	const emailRef = React.useRef<HTMLInputElement>(null);
	const passwordRef = React.useRef<HTMLInputElement>(null);

	const problems = (current: typeof values): Partial<Record<Field, string>> => ({
		name: current.name.trim() ? undefined : t('error_name_required'),
		email: validEmail(current.email.trim()) ? undefined : t('error_email_invalid'),
		password: current.password.length >= MIN_PASSWORD ? undefined : t('error_password_short'),
	});
	const errors = submitted ? problems(values) : {};
	if (serverError?.field && !errors[serverError.field]) errors[serverError.field] = serverError.text;

	const set = (field: Field) => (event: React.ChangeEvent<HTMLInputElement>) => {
		setValues((current) => ({ ...current, [field]: event.target.value }));
		setServerError(undefined);
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy || limited.active) return;
		setSubmitted(true);
		setServerError(undefined);
		const invalid = (['name', 'email', 'password'] as const).find((field) => problems(values)[field]);
		if (invalid) {
			({ name: nameRef, email: emailRef, password: passwordRef })[invalid].current?.focus();
			return;
		}
		const email = values.email.trim();
		const account = { name: values.name.trim(), email, password: values.password, locale, next };
		setBusy(true);
		try {
			if (convert) {
				await convertAnonymous(account);
				// C12, dropped without consent; never the address.
				track('sign_up', { method: 'convert' });
			} else await signUp({ ...account, captchaToken: await captcha.getToken() });
			setSentTo(email);
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			// The API's convert-password refuses the password itself (its policy or GoTrue's) with an issue on it.
			const passwordRefused = failure instanceof ApiError && failure.issues?.some((i) => i.path === 'password');
			if (code === 'CONFLICT' && convert) {
				setServerError({ field: 'email', text: t('convert_email_taken') });
				emailRef.current?.focus();
			} else if (code === 'CONFLICT') setSentTo(email);
			else if (convert && passwordRefused) {
				setServerError({ field: 'password', text: t('error_password_weak') });
				passwordRef.current?.focus();
			} else if (code === 'RATE_LIMITED') {
				limited.start();
				setServerError({ text: t('error_rate_limited'), note: 'limited' });
			} else if (code === 'CAPTCHA_FAILED') setServerError({ text: te('CAPTCHA_FAILED'), note: 'captcha' });
			else setServerError({ text: errorText(failure) });
		} finally {
			setBusy(false);
		}
	};

	if (sentTo)
		return (
			<CheckEmail
				email={sentTo}
				sent
				convert={convert}
				next={next}
				onChange={() => {
					setSentTo(undefined);
					// After the form is back.
					setTimeout(() => emailRef.current?.focus());
				}}
			/>
		);

	const note =
		serverError?.note === 'captcha' || (serverError?.note === 'limited' && limited.active)
			? serverError
			: undefined;

	return (
		<>
			<AuthHeading>{t('signup_title')}</AuthHeading>
			{convert && (
				<p className="mt-3 flex gap-2 text-lg leading-7">
					<ShieldCheckIcon weight="fill" aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
					<span>{t('convert_note')}</span>
				</p>
			)}
			<form noValidate onSubmit={submit} className="mt-10">
				<div className="grid gap-6">
					<FormField label={t('name_label')} hint={t('name_help')} error={errors.name}>
						<Input
							ref={nameRef}
							name="name"
							autoComplete="given-name"
							maxLength={60}
							value={values.name}
							onChange={set('name')}
						/>
					</FormField>
					<FormField label={t('email_label')} error={errors.email}>
						<Input
							ref={emailRef}
							type="email"
							name="email"
							autoComplete="email"
							inputMode="email"
							autoCapitalize="none"
							spellCheck={false}
							value={values.email}
							onChange={set('email')}
						/>
					</FormField>
					<PasswordField
						ref={passwordRef}
						name="new-password"
						label={t('password_label')}
						hint={t('password_hint')}
						error={errors.password}
						autoComplete="new-password"
						value={values.password}
						onChange={set('password')}
					/>
				</div>
				<p className="mt-6 text-sm text-muted-foreground">
					{t.rich('terms_sentence', {
						terms: (chunks) => (
							<Link href="/terms" className={inlineLink}>
								{chunks}
							</Link>
						),
						privacy: (chunks) => (
							<Link href="/privacy" className={inlineLink}>
								{chunks}
							</Link>
						),
					})}
				</p>
				{note ? (
					<AuthNote icon={note.note === 'captcha' ? ShieldWarningIcon : ClockIcon} className="mt-6">
						{note.text}
					</AuthNote>
				) : serverError && !serverError.note && !serverError.field ? (
					<FieldError className="mt-6">{serverError.text}</FieldError>
				) : null}
				{captcha.widget}
				<Button type="submit" size="lg" className="mt-8 w-full" loading={busy} disabled={limited.active}>
					{t('signup_button')}
				</Button>
			</form>
			{!convert && <ProviderButtons next={next} className="mt-6" />}
			<Button asChild variant="text" className="mt-4 w-full">
				<Link
					href={{
						pathname: '/sign-in',
						query: { ...(values.email.trim() && { email: values.email.trim() }), ...(next && { next }) },
					}}
				>
					{t('to_signin')}
				</Link>
			</Button>
		</>
	);
}
