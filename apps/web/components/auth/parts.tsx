'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { ApiError, type ErrorCode } from '@zivali/api/client';
import type { QueryError } from '@zivali/api/rtk';
import { h1Class } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import { useCaptcha } from './turnstile';

// P16 web parts: the flow column, password field, calm note and the resend cooldown (the provider buttons are in
// provider-buttons.tsx, with lib/auth). Same names as the mobile parts (apps/mobile/components/auth/parts.tsx).

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

/**
 * Spot icon (P16 M4, M5): 88 px `secondary` circle around a 40 px `primary` glyph (pass the bold icon); `className`
 * retints it (P15 cancelled: `bg-muted text-muted-foreground`).
 */
export function Spot({ className, children }: { className?: string; children: React.ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'mb-8 grid size-22 place-items-center rounded-full bg-secondary text-primary [&_svg]:size-10',
				className
			)}
		>
			{children}
		</span>
	);
}

/** The C1 code of a thrown ApiError or of an RTK Query error (`{ status, data: { code } }`); else INTERNAL. */
export const errorCode = (error: unknown): ErrorCode =>
	error instanceof ApiError ? error.code : ((error as Partial<QueryError> | undefined)?.data?.code ?? 'INTERNAL');

/** ApiError or RTK Query error code → its errors.* sentence (C1); anything else is the generic one. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (error: unknown) => {
		const code = errorCode(error);
		if (code === 'RATE_LIMITED') return t('RATE_LIMITED_generic');
		return t.has(code) ? t(code) : t('INTERNAL');
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
export function useCooldown(initialSeconds = 0) {
	const [left, setLeft] = React.useState(initialSeconds);
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
	// Cooling down from the start when the email was sent just before this view opened.
	const cooldown = useCooldown(coolingDown ? 60 : 0);
	const captcha = useCaptcha();
	const [sending, setSending] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const waitId = React.useId();
	const { start } = cooldown;

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
