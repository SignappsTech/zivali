'use client';

import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getPathname } from '@/i18n/navigation';
import { resendConfirmation } from '@/lib/auth';

import type { AuthGateReason } from './gate';
import { ProviderButtons, ResendButton } from './parts';

// The bodies of the gates in gate.tsx, loaded only when one shows: they bring lib/auth (supabase-js), the captcha
// and the providers, which the pages that merely hold a gate do not need up front.

const noSubscription = () => () => {};
const currentPage = () => window.location.pathname + window.location.search;

/**
 * P16 G2 unverified variant as page content (alerts, chat): signed in, address not confirmed yet. Not an error: no
 * red, drafts keep working; "Pošlji znova" is the primary on web. `email_verified` comes from GET /v1/me (the server
 * reads auth.users), never from the token or user_metadata.
 */
export function VerifyEmailPrompt({ email, title = 'h1' }: { email: string; title?: 'h1' | 'h2' }) {
	const t = useTranslations('auth');
	const locale = useLocale();
	const Title = title;

	return (
		<div className="max-w-[440px]">
			<Title className="font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance">
				{t('gate_unverified_title')}
			</Title>
			<p className="mt-3 text-lg leading-7 break-words">{t('gate_unverified_body', { email })}</p>
			<div className="mt-7 grid gap-1">
				<ResendButton
					primary
					label={t('gate_unverified_resend')}
					onResend={(captchaToken) => resendConfirmation(email, locale, captchaToken)}
				/>
			</div>
		</div>
	);
}

type GateDialogProps = {
	reason: AuthGateReason;
	title?: string;
	body?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Signed in but unconfirmed: the "Potrdite svoj e-naslov" variant for this address. */
	unverifiedEmail?: string;
};

/** The P16 W3 dialog of AuthGate (gate.tsx). */
export function GateDialog({ reason, title, body, open, onOpenChange, unverifiedEmail }: GateDialogProps) {
	const t = useTranslations('auth');
	const locale = useLocale();
	// The page as the browser shows it (localised), read on each render: where sign-in returns to.
	const here = React.useSyncExternalStore(noSubscription, currentPage, () => '/');
	const to = (pathname: '/sign-in' | '/sign-up') =>
		getPathname({ locale, href: { pathname, query: { next: here } } });

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				{unverifiedEmail !== undefined ? (
					<>
						<DialogTitle>{t('gate_unverified_title')}</DialogTitle>
						<DialogDescription className="break-words">
							{t('gate_unverified_body', { email: unverifiedEmail })}
						</DialogDescription>
						<div className="mt-6 grid gap-1">
							<ResendButton
								primary
								label={t('gate_unverified_resend')}
								onResend={(captchaToken) => resendConfirmation(unverifiedEmail, locale, captchaToken)}
							/>
							<DialogClose asChild>
								<Button variant="text" className="w-full">
									{t('gate_cancel')}
								</Button>
							</DialogClose>
						</div>
					</>
				) : (
					<>
						<DialogTitle>{title ?? t(`gate_title_${reason}`)}</DialogTitle>
						<DialogDescription className="flex gap-2">
							<ShieldCheckIcon
								weight="fill"
								aria-hidden="true"
								className="mt-0.5 size-5 shrink-0 text-primary"
							/>
							<span>{body ?? t('gate_kept')}</span>
						</DialogDescription>
						<div className="mt-6 grid gap-3">
							<Button asChild size="lg" className="w-full">
								<NextLink href={to('/sign-in')}>{t('gate_signin')}</NextLink>
							</Button>
							<Button asChild variant="secondary" className="w-full">
								<NextLink href={to('/sign-up')}>{t('gate_signup')}</NextLink>
							</Button>
							<ProviderButtons next={here} />
							<DialogClose asChild>
								<Button variant="text" className="w-full">
									{t('gate_cancel')}
								</Button>
							</DialogClose>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
