'use client';

import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';

import { useRequireAuth } from '@zivali/api/auth';
import { InlineError, PageSkeleton } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { getPathname } from '@/i18n/navigation';
import { resendConfirmation } from '@/lib/auth';

import { ProviderButtons, ResendButton } from './parts';
import { useConfigureAuth } from './session-sync';

const noSubscription = () => () => {};
const currentPage = () => window.location.pathname + window.location.search;

export type AuthGateReason = 'report' | 'contact' | 'alerts' | 'tip' | 'pets';

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

/**
 * Page content that needs a confirmed address (alerts, chat, FR-001): an unconfirmed account gets the
 * VerifyEmailPrompt instead. Signed-in pages only (the server guard sends visitors to sign-in first).
 */
export function VerifiedOnly({ children }: { children: React.ReactNode }) {
	const { gate, me } = useRequireAuth({ verified: true });
	if (gate === 'ok') return children;
	if (gate === 'verify') return <VerifyEmailPrompt email={me?.email ?? ''} />;
	if (gate === 'error') return <InlineError />;
	return <PageSkeleton />;
}

type AuthGateProps = {
	/** Picks the title (P16 §5); report lost may pass its own title and body (P6). */
	reason: AuthGateReason;
	title?: string;
	body?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Runs once the user has a verified account: at once when they already had one. */
	onReady?: () => void;
};

/**
 * P16 W3 contextual gate, a dialog over the step that needs an account. Signed out: sign in, create an account
 * (both return here through `next`) and the providers; signed in but unconfirmed: the "Potrdite svoj e-naslov"
 * variant. Focus is trapped; Escape and "Prekliči" close it and focus returns to the opener. What the user entered
 * is kept by the step itself (C4 drafts), since sign-in leaves the page.
 *
 * Usage: `<AuthGate reason="contact" open={open} onOpenChange={setOpen} onReady={send} />`, opened on the action.
 */
export function AuthGate({ reason, title, body, open, onOpenChange, onReady }: AuthGateProps) {
	const t = useTranslations('auth');
	const locale = useLocale();
	useConfigureAuth(open);
	const { gate, me } = useRequireAuth({ verified: true });
	// The page as the browser shows it (localised), read on each render: where sign-in returns to.
	const here = React.useSyncExternalStore(noSubscription, currentPage, () => '/');

	React.useEffect(() => {
		if (!open || gate !== 'ok') return;
		onOpenChange(false);
		onReady?.();
	}, [gate, open, onOpenChange, onReady]);

	const unverified = gate === 'verify';
	const to = (pathname: '/sign-in' | '/sign-up') =>
		getPathname({ locale, href: { pathname, query: { next: here } } });

	return (
		<Dialog open={open && (gate === 'signin' || unverified)} onOpenChange={onOpenChange}>
			<DialogContent>
				{unverified ? (
					<>
						<DialogTitle>{t('gate_unverified_title')}</DialogTitle>
						<DialogDescription className="break-words">
							{t('gate_unverified_body', { email: me?.email ?? '' })}
						</DialogDescription>
						<div className="mt-6 grid gap-1">
							<ResendButton
								primary
								label={t('gate_unverified_resend')}
								onResend={(captchaToken) => resendConfirmation(me?.email ?? '', locale, captchaToken)}
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
