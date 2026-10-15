'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { ApiError } from '@zivali/api/client';
import en from '@zivali/i18n/dist/en.json';
import { h1Class } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { providers, signInWithProvider } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { useCaptcha } from './turnstile';

// P16 web parts: the flow column, password field, calm note, provider buttons and the resend cooldown. Same names
// as the mobile parts (apps/mobile/components/auth/parts.tsx).

/**
 * P16 web: the flow variant's centred 440 px column (full width with 20 px gutters below it), `main#main`, with the
 * toasts of the auth views (provider cancelled).
 */
export function AuthMain({ children }: { children: React.ReactNode }) {
	const t = useTranslations('common');
	return (
		<main id="main" className="mx-auto box-content max-w-[440px] px-5 pt-6 pb-16 lg:pb-24">
			{children}
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</main>
	);
}

/** The page h1. `focus` moves focus to it when the view changes in place (check email, done), so it is announced. */
export function AuthHeading({ focus = false, children }: { focus?: boolean; children: React.ReactNode }) {
	const ref = React.useRef<HTMLHeadingElement>(null);
	React.useEffect(() => {
		if (focus) ref.current?.focus();
	}, [focus]);
	return (
		<h1 ref={ref} tabIndex={-1} className={cn(h1Class, 'outline-none')}>
			{children}
		</h1>
	);
}

/** Spot icon (P16 M4, M5): 88 px `secondary` circle around a 40 px `primary` glyph (pass the bold icon). */
export function Spot({ children }: { children: React.ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className="mb-8 grid size-22 place-items-center rounded-full bg-secondary text-primary [&_svg]:size-10"
		>
			{children}
		</span>
	);
}

/** ApiError code → its errors.* sentence (C1); anything else is the generic one. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (error: unknown) => {
		const code = error instanceof ApiError ? error.code : 'INTERNAL';
		if (code === 'RATE_LIMITED') return t('RATE_LIMITED_generic');
		return t(code in en.errors ? (code as keyof typeof en.errors) : 'INTERNAL');
	};
}

type PasswordFieldProps = Omit<React.ComponentProps<'input'>, 'type'> & {
	label: string;
	hint?: string;
	error?: string;
	/** Single-question screens use the 64 px field. */
	large?: boolean;
};

/** Password line field with the eye button, renamed "Pokaži geslo" / "Skrij geslo" as it toggles. */
export function PasswordField({ label, hint, error, large, className, ...props }: PasswordFieldProps) {
	const t = useTranslations('auth');
	const [shown, setShown] = React.useState(false);

	return (
		<FormField label={label} hint={error ? undefined : hint} error={error} className={className}>
			<div className="relative">
				<Input
					type={shown ? 'text' : 'password'}
					autoCapitalize="none"
					spellCheck={false}
					className={cn('pr-13', large && 'min-h-16')}
					{...props}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={t(shown ? 'password_hide' : 'password_show')}
					onClick={() => setShown(!shown)}
					className="absolute top-1/2 right-0 -translate-y-1/2"
				>
					{shown ? (
						<EyeSlashIcon weight="bold" aria-hidden="true" />
					) : (
						<EyeIcon weight="bold" aria-hidden="true" />
					)}
				</Button>
			</div>
		</FormField>
	);
}

/** Calm note (system §10.9 Note): `muted` surface, radius 20, icon 22, text 15/22; announced politely, never red. */
export function AuthNote({
	icon: Icon,
	id,
	className,
	children,
}: {
	icon: PhosphorIcon;
	id?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			id={id}
			role="status"
			className={cn('flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control leading-[22px]', className)}
		>
			<Icon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<p className="min-w-0 flex-1">{children}</p>
		</div>
	);
}

/** Seconds left of a cooldown, shown in steps of 10 so the live text does not chatter (P16 M4). */
export function useCooldown() {
	const [left, setLeft] = React.useState(0);
	React.useEffect(() => {
		if (left <= 0) return;
		const timer = setTimeout(() => setLeft(left - 1), 1000);
		return () => clearTimeout(timer);
	}, [left]);
	const start = React.useCallback((seconds = 60) => setLeft(seconds), []);
	return { active: left > 0, shown: Math.ceil(left / 10) * 10, start };
}

/**
 * "Pošlji znova" with the cooldown text under it (Supabase sends one confirmation email a minute). `primary` on web
 * where there is no "Odpri e-pošto" (P16 G2). The captcha runs per send.
 */
export function ResendButton({
	label,
	onResend,
	coolingDown = false,
	primary = false,
}: {
	label: string;
	onResend: (captchaToken?: string) => Promise<unknown>;
	coolingDown?: boolean;
	primary?: boolean;
}) {
	const t = useTranslations('auth');
	const errorText = useErrorText();
	const cooldown = useCooldown();
	const captcha = useCaptcha();
	const [sending, setSending] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const waitId = React.useId();
	const { start } = cooldown;

	React.useEffect(() => {
		// Once, for the email that was sent just before this view opened.
		if (coolingDown) start();
	}, [coolingDown, start]);

	const resend = async () => {
		setSending(true);
		setError(undefined);
		try {
			await onResend(await captcha.getToken());
			start();
		} catch (failure) {
			// Too soon: the cooldown text says when; anything else is said under the button.
			if (failure instanceof ApiError && failure.code === 'RATE_LIMITED') start();
			else setError(errorText(failure));
		} finally {
			setSending(false);
		}
	};

	return (
		<>
			{captcha.widget}
			<Button
				variant={primary ? 'default' : 'text'}
				size={primary ? 'lg' : 'default'}
				className={primary ? 'w-full' : undefined}
				disabled={cooldown.active}
				loading={sending}
				aria-describedby={cooldown.active ? waitId : undefined}
				onClick={resend}
			>
				{label}
			</Button>
			<p
				id={waitId}
				aria-live="polite"
				className="text-center text-sm text-muted-foreground tabular-nums empty:hidden"
			>
				{cooldown.active ? t('check_resend_wait', { seconds: cooldown.shown }) : null}
			</p>
			{error && <FieldError>{error}</FieldError>}
		</>
	);
}

// Official marks (brand-literal, like the provider tokens): Google "G" in full colour in both modes, the Apple logo in
// the label colour.
function GoogleGlyph() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			/>
			<path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			/>
			<path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			/>
			<path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			/>
		</svg>
	);
}

function AppleGlyph() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
			/>
		</svg>
	);
}

/**
 * Google and Apple (system §10.2): 48 px, full width, 12 apart, Google first, the same on the page and in dialogs,
 * with "ali" above. Only the enabled ones show; with none, nothing renders. A click leaves for the provider (OAuth,
 * PKCE); `next` is where the callback returns to. They stay enabled while email sign-in is rate limited.
 */
export function ProviderButtons({ next, className }: { next?: string; className?: string }) {
	const t = useTranslations('auth');
	const locale = useLocale();
	const errorText = useErrorText();
	const [busy, setBusy] = React.useState<'google' | 'apple' | null>(null);
	const [error, setError] = React.useState<string>();
	const available = (['google', 'apple'] as const).filter((provider) => providers[provider]);
	if (available.length === 0) return null;

	const press = async (provider: 'google' | 'apple') => {
		setBusy(provider);
		setError(undefined);
		try {
			await signInWithProvider(provider, locale, next ?? window.location.pathname + window.location.search);
		} catch (failure) {
			setError(errorText(failure));
			setBusy(null);
		}
	};

	return (
		<div className={cn('grid gap-3', className)}>
			<p className="text-center text-muted-foreground">{t('or')}</p>
			{available.map((provider) => (
				<Button
					key={provider}
					type="button"
					variant="provider"
					className="w-full"
					loading={busy === provider}
					onClick={() => press(provider)}
				>
					{provider === 'google' ? <GoogleGlyph /> : <AppleGlyph />}
					{t(provider)}
				</Button>
			))}
			{error && <FieldError>{error}</FieldError>}
		</div>
	);
}
