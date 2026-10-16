'use client';

import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { type EventParams, track } from '@zivali/analytics';
import { useRequireAuth } from '@zivali/api/auth';
import { redirectToCheckout, startCheckout, useGetPaymentQuery } from '@zivali/api/payments';
import type { ApiStore } from '@zivali/api/rtk';
import { type Payment, type PaymentStatus, USER_AMOUNT_PURPOSES, type Uuid } from '@zivali/types';
import { Link } from '@/i18n/navigation';
import { settlePayment } from '@/components/payments/answers';
import { Spot, useErrorText } from '@/components/auth/parts';
import { InlineError } from '@/components/shell/page';
import { noteClass } from '@/components/shelters/classes';
import { Button, Spinner } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type View = 'success' | 'canceled' | 'failed' | 'pending';

// A refund cannot reach the return page in practice (it follows days later); it reads as "nothing charged".
const VIEW: Record<PaymentStatus, View> = {
	pending: 'pending',
	succeeded: 'success',
	failed: 'failed',
	canceled: 'canceled',
	refunded: 'canceled',
};
const POLL_MS = 3000;
// The webhook normally lands within seconds; after this the page stops asking and points to My payments.
const POLL_LIMIT_MS = 90_000;

/** C12 `donation` for a succeeded contribution: euros, the amount bucket and the purpose, nothing else (as on mobile). */
function donation({ purpose, amount_cents, currency }: Payment): EventParams['donation'] | null {
	if (purpose !== 'tip' && purpose !== 'report_contribution' && purpose !== 'support') return null;
	const value = amount_cents / 100;
	const amount_bucket = value < 5 ? '2-4' : value < 10 ? '5-9' : value < 20 ? '10-19' : '20+';
	return { value, currency, amount_bucket, purpose };
}

const headingClass = 'font-display text-2xl font-bold tracking-[-0.015em] text-balance outline-none lg:text-3xl';
const bodyClass = 'mt-3 text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8';
const actionsClass = 'mt-8 grid gap-1 lg:mt-10 lg:flex lg:flex-wrap lg:items-center lg:gap-3';

/** The page h1 in the h2 type role (P15 W2); it takes focus when it mounts, so each state is announced. */
function Heading({ children }: { children: string }) {
	const ref = React.useRef<HTMLHeadingElement>(null);
	React.useEffect(() => {
		ref.current?.focus();
		document.title = `${children} · Najdimo`;
	}, [children]);
	return (
		<h1 ref={ref} tabIndex={-1} className={headingClass}>
			{children}
		</h1>
	);
}

function Note({ icon: Icon, children }: { icon: typeof CreditCardIcon; children: string }) {
	return (
		<div className={cn(noteClass, 'mt-4 lg:mt-5')}>
			<Icon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<p>{children}</p>
		</div>
	);
}

type Props = {
	paymentId: Uuid;
	/** Same-origin browser path the payment started from (C13 return_to), already checked by the page. */
	returnTo: string;
	/** Stripe's cancel URL (`canceled=1`): the session is left open, nothing was charged. */
	canceled: boolean;
};

/**
 * P15 return states on web (C15 paymentsReturn, a protected flow: no ads). The webhook may land after the redirect,
 * so a pending payment is polled until it settles. Retry opens a new checkout with the same purpose and amount; a
 * report contribution needs its report, which the payment read does not carry, so it goes back to start it there.
 */
export function PaymentReturn({ paymentId, returnTo, canceled }: Props) {
	const t = useTranslations('payments');
	const tSupport = useTranslations('support');
	const locale = useLocale();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	const { gate } = useRequireAuth({ verified: true });
	const [settled, setSettled] = React.useState(false);
	const [timedOut, setTimedOut] = React.useState(false);
	const [retrying, setRetrying] = React.useState(false);
	const [retryError, setRetryError] = React.useState<string>();
	const query = useGetPaymentQuery(
		{ id: paymentId },
		{ pollingInterval: settled || timedOut ? 0 : POLL_MS, skipPollingIfUnfocused: true }
	);
	const payment = query.data;
	// The server status wins; the cancel URL hint only covers the time the payment is still pending.
	const status = payment ? VIEW[payment.status] : 'pending';
	const view: View = status === 'pending' && canceled ? 'canceled' : status;
	if (!settled && view !== 'pending') setSettled(true);
	// Success: the ask the payment answered says thanks from now on, and `donation` goes out once (a no-op without
	// analytics consent, C12; a reload does not send it again).
	const succeeded = view === 'success' ? payment : undefined;
	React.useEffect(() => {
		if (!succeeded || !settlePayment(succeeded.id)) return;
		const params = donation(succeeded);
		if (params) track('donation', params);
	}, [succeeded]);
	React.useEffect(() => {
		if (settled) return;
		const timer = setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
		return () => clearTimeout(timer);
	}, [settled]);

	async function retry() {
		if (!payment) return;
		setRetrying(true);
		setRetryError(undefined);
		try {
			const { checkoutUrl } = await startCheckout(dispatch, {
				purpose: payment.purpose,
				amountCents: payment.amount_cents,
				returnTo,
				locale,
			});
			redirectToCheckout(checkoutUrl);
		} catch (error) {
			setRetryError(errorText(error));
			setRetrying(false);
		}
	}

	const back = (label: string, primary = true) => (
		<Button asChild size="lg" variant={primary ? 'default' : 'text'}>
			<NextLink href={returnTo}>{label}</NextLink>
		</Button>
	);
	// Only purposes with a user-chosen amount can start again; boost and subscription have no checkout until M4.
	const retryButton = (label: string, primary: boolean) =>
		!payment || !(USER_AMOUNT_PURPOSES as readonly string[]).includes(payment.purpose) ? null : payment.purpose ===
		  'report_contribution' ? (
			back(label, primary)
		) : (
			<Button size="lg" variant={primary ? 'default' : 'text'} loading={retrying} onClick={retry}>
				{label}
			</Button>
		);
	const retryAlert = retryError && (
		<p role="alert" className="mt-4 text-destructive">
			{retryError}
		</p>
	);

	return (
		<main id="main" className="mx-auto box-content max-w-[560px] px-5 pt-10 pb-16 lg:pt-16 lg:pb-32">
			{view === 'success' && (
				<>
					<Spot>
						<CheckIcon weight="bold" />
					</Spot>
					<Heading>{t('success_title')}</Heading>
					{gate === 'verify' ? (
						<Note icon={EnvelopeSimpleIcon}>{tSupport('unverified')}</Note>
					) : (
						<p className={bodyClass}>{t('success_body')}</p>
					)}
					<div className={actionsClass}>{back(t('success_back'))}</div>
				</>
			)}
			{view === 'canceled' && (
				<>
					<Spot className="bg-muted text-muted-foreground">
						<XIcon weight="bold" />
					</Spot>
					<Heading>{t('cancel_title')}</Heading>
					<p className={bodyClass}>{t('cancel_body')}</p>
					<div className={actionsClass}>
						{back(t('cancel_back'))}
						{retryButton(t('cancel_retry'), false)}
					</div>
					{retryAlert}
				</>
			)}
			{view === 'failed' && (
				<>
					<Heading>{t('failed_title')}</Heading>
					<Note icon={CreditCardIcon}>{t('failed_body')}</Note>
					<div className={actionsClass}>
						{retryButton(t('failed_retry'), true)}
						{back(t('failed_skip'), false)}
					</div>
					{retryAlert}
				</>
			)}
			{view === 'pending' && (
				<>
					<div role="status" aria-live="polite" aria-busy="true">
						<Spot>
							<Spinner className="size-9 border-[3.5px]" />
						</Spot>
						<Heading>{t('pending_title')}</Heading>
						<p className={bodyClass}>{t('pending_body')}</p>
						{timedOut && <p className={bodyClass}>{t('pending_slow')}</p>}
					</div>
					{query.isError && (
						<div className="mt-6">
							<InlineError onRetry={query.refetch} retrying={query.isFetching} />
						</div>
					)}
					<Button asChild variant="text" className="mt-8 -ml-3">
						<NextLink href={returnTo}>{t('pending_back')}</NextLink>
					</Button>
					{timedOut && (
						<Button asChild variant="text" className="mt-2 -ml-3 block">
							<Link href="/account/payments">{t('pending_payments')}</Link>
						</Button>
					)}
				</>
			)}
		</main>
	);
}
