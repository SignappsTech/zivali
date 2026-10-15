'use client';

import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { getPathname, Link } from '@/i18n/navigation';
import { signIn } from '@/lib/auth';

import { AuthHeading, AuthNote, PasswordField, ProviderButtons, useCooldown, useErrorText } from './parts';
import { CheckEmail } from './sign-up';
import { useCaptcha } from './turnstile';

export type SignInNotice = 'expired' | 'cancelled' | 'failed';

/**
 * P16 W1 sign in. A wrong pair, an unknown address and a malformed one all get the one message under the fields
 * (E1); an unconfirmed address opens the check-email view. On success the page reloads at `next` (or home), so the
 * server-rendered header and the API cache start fresh for the signed-in user.
 */
export function SignInForm({
	next,
	email: initialEmail = '',
	notice,
}: {
	next?: string;
	email?: string;
	notice?: SignInNotice;
}) {
	const t = useTranslations('auth');
	const te = useTranslations('errors');
	const locale = useLocale();
	const errorText = useErrorText();
	const captcha = useCaptcha();
	const limited = useCooldown();
	const [email, setEmail] = React.useState(initialEmail);
	const [password, setPassword] = React.useState('');
	const [error, setError] = React.useState<{ text: string; captcha?: boolean }>();
	const [busy, setBusy] = React.useState(false);
	const [unconfirmed, setUnconfirmed] = React.useState<string>();
	const emailRef = React.useRef<HTMLInputElement>(null);
	const errorId = React.useId();

	React.useEffect(() => {
		// From the Google round trip (app/[locale]/auth/callback): quiet, the form stays as it was (P16 E4).
		if (notice === 'cancelled') toast(t('provider_cancelled'));
		else if (notice === 'failed') toast.error(te('INTERNAL'));
	}, [notice, t, te]);

	const edit = (set: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
		set(event.target.value);
		setError(undefined);
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy || limited.active) return;
		const address = email.trim();
		if (!address || !password) {
			setError({ text: t('error_credentials') });
			return;
		}
		setBusy(true);
		setError(undefined);
		try {
			await signIn(address, password, await captcha.getToken());
			window.location.assign(next ?? getPathname({ locale, href: '/' }));
			return;
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			if (code === 'UNVERIFIED_EMAIL') setUnconfirmed(address);
			else if (code === 'RATE_LIMITED') limited.start();
			else if (code === 'CAPTCHA_FAILED') setError({ text: te('CAPTCHA_FAILED'), captcha: true });
			else
				setError({
					text:
						code === 'UNAUTHENTICATED' || code === 'VALIDATION'
							? t('error_credentials')
							: errorText(failure),
				});
		}
		setBusy(false);
	};

	if (unconfirmed)
		return (
			<CheckEmail
				email={unconfirmed}
				sent={false}
				onChange={() => {
					setUnconfirmed(undefined);
					setTimeout(() => emailRef.current?.focus());
				}}
			/>
		);

	const query = { ...(email.trim() && { email: email.trim() }), ...(next && { next }) };

	return (
		<>
			<AuthHeading>{t('signin_title')}</AuthHeading>
			{notice === 'expired' && (
				<AuthNote icon={LinkBreakIcon} className="mt-6">
					<b>{t('link_failed_title')}</b> {t('link_failed_body')}
				</AuthNote>
			)}
			<form
				noValidate
				onSubmit={submit}
				aria-describedby={error && !error.captcha ? errorId : undefined}
				className="mt-10"
			>
				<div className="grid gap-6">
					<FormField label={t('email_label')}>
						<Input
							ref={emailRef}
							type="email"
							name="email"
							autoComplete="email"
							inputMode="email"
							autoCapitalize="none"
							spellCheck={false}
							value={email}
							onChange={edit(setEmail)}
						/>
					</FormField>
					<PasswordField
						name="password"
						label={t('password_label')}
						autoComplete="current-password"
						value={password}
						onChange={edit(setPassword)}
					/>
				</div>
				{error && !error.captcha && (
					<FieldError id={errorId} className="mt-4">
						{error.text}
					</FieldError>
				)}
				<Button asChild variant="text" className="mt-1 -ml-3">
					<Link href={{ pathname: '/reset-password', query: email.trim() ? { email: email.trim() } : {} }}>
						{t('forgot_link')}
					</Link>
				</Button>
				{limited.active ? (
					<AuthNote icon={ClockIcon} id={`${errorId}-note`} className="mt-4">
						{t('error_rate_limited')}
					</AuthNote>
				) : error?.captcha ? (
					<AuthNote icon={ShieldWarningIcon} className="mt-4">
						{error.text}
					</AuthNote>
				) : null}
				{captcha.widget}
				<Button
					type="submit"
					size="lg"
					className="mt-8 w-full"
					loading={busy}
					disabled={limited.active}
					aria-describedby={limited.active ? `${errorId}-note` : undefined}
				>
					{t('signin_button')}
				</Button>
			</form>
			<ProviderButtons next={next} className="mt-6" />
			<Button asChild variant="text" className="mt-4 w-full">
				<Link href={{ pathname: '/sign-up', query }}>{t('to_signup')}</Link>
			</Button>
		</>
	);
}
