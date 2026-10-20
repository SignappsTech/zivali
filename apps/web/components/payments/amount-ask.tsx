'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { skipToken } from '@reduxjs/toolkit/query';
import { useLocale, useTranslations } from 'next-intl';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { commerceParams, flowTracker, track } from '@zivali/analytics';
import { uuid } from '@zivali/api/client';
import { useGetPublicConfigQuery } from '@zivali/api/config';
import type { StartCheckoutInput } from '@zivali/api/payments';
import type { ApiStore, QueryError } from '@zivali/api/rtk';
import { formatEur, type Locale } from '@zivali/i18n/format';
import { errorCode, useErrorText } from '@/components/auth/parts';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PillCheck, pillClass } from '@/components/ui/pill';
import { cn } from '@/lib/utils';

// The P15 amount ask, the web twin of the mobile AmountAsk (apps/mobile/components/payments/support.tsx): nothing
// pre-selected, Pay and Skip of the same variant and size, and the payments client loaded only when Pay is pressed, so
// no page ships it before someone chooses to pay (TASK-33.2).

const MIN_CENTS = 200;
const MAX_CENTS = 50_000;
const SUGGESTED = '5';

/** What to pay (C13); the ask adds the amount, the locale and the idempotency key. */
export type Checkout = Omit<StartCheckoutInput, 'amountCents' | 'locale' | 'returnScheme' | 'idempotencyKey'>;

/** "Drug znesek" in integer cents: accepts "2,5" and "2.5"; undefined when it is not a plain decimal (max 2 places). */
export function toCents(text: string): number | undefined {
	const s = text.trim();
	return /^\d+([.,]\d{1,2})?$/.test(s) ? Math.round(Number(s.replace(',', '.')) * 100) : undefined;
}

type AmountAskProps = {
	/** `tip`: 3, 5 (suggested) and 10 € or another amount, for the reunited tip and the Profile card. */
	kind: 'tip' | 'contribution';
	/** Without it Pay waits (the report is still loading). */
	checkout?: Checkout;
	/** Outside production: the test-payment note (APP_ENV, read by the server page). */
	testMode: boolean;
	onSkip?: () => void;
	/** The checkout was created and the browser is leaving for it. */
	onCheckout?: (paymentId: string) => void;
};

/**
 * The amount pills (a radiogroup, none chosen), "Drug znesek" with the 2 to 500 € check (tip), the unticked monthly box
 * when the public `flags.supporter_monthly` is on (tip), an error with Poskusi znova in Pay's place, Pay and Skip, then
 * the voluntary-payment line and the test note. Pay creates the Checkout session and redirects to it (C13).
 */
export function AmountAsk({ kind, checkout, testMode, onSkip, onCheckout }: AmountAskProps) {
	const t = useTranslations('support');
	const tc = useTranslations('common');
	const tp = useTranslations('payments');
	const locale = useLocale() as Locale;
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	const tip = kind === 'tip';
	const { data: config } = useGetPublicConfigQuery(tip ? undefined : skipToken);
	const monthlyOffered = tip && config?.['flags.supporter_monthly'] === true;
	const [choice, setChoice] = React.useState('');
	const [other, setOther] = React.useState('');
	const [touched, setTouched] = React.useState(false);
	const [monthly, setMonthly] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const [failure, setFailure] = React.useState<string>();
	// One Idempotency-Key per attempt: Poskusi znova with the same choice reopens the same session (C1, C13); another
	// amount is another attempt.
	const attempt = React.useRef<{ input: string; key: string }>(undefined);
	const id = React.useId();
	// C12b §6: the ask shown, each refused start, and begin_checkout right before Checkout (no-ops without consent).
	const tracker = React.useRef(flowTracker('checkout'));
	React.useEffect(() => {
		tracker.current.step('amount');
	}, []);
	// Back from Checkout restores the page from the bfcache with `busy` still set; start over.
	React.useEffect(() => {
		const show = (event: PageTransitionEvent) => event.persisted && setBusy(false);
		window.addEventListener('pageshow', show);
		return () => window.removeEventListener('pageshow', show);
	}, []);

	const pills = tip
		? ([
				['3', t('amount_3')],
				['5', t('amount_5')],
				['10', t('amount_10')],
			] as const)
		: ([
				['2', t('contribution_2')],
				['3', t('contribution_3')],
				['5', t('contribution_5')],
			] as const);
	const cents = choice === 'other' ? toCents(other) : choice ? Number(choice) * 100 : undefined;
	const valid = cents !== undefined && cents >= MIN_CENTS && cents <= MAX_CENTS;
	const fieldError =
		choice === 'other' && touched && other.trim() && !valid
			? t(cents !== undefined && cents > MAX_CENTS ? 'amount_max_error' : 'amount_min_error')
			: undefined;
	const amount = valid ? formatEur(cents, locale) : '';
	const subscription = monthly && monthlyOffered;
	const payLabel = !valid
		? t(tip ? 'pay_disabled' : 'contribution_pay_disabled')
		: subscription
			? t('supporter_monthly_label')
			: t(tip ? 'pay' : 'contribution_pay', { amount });
	const help = valid || fieldError ? undefined : t('pay_disabled_help');
	const fieldId = `${id}-other`;

	const change =
		<T,>(set: (value: T) => void) =>
		(value: T) => {
			set(value);
			setFailure(undefined);
		};

	async function pay(event: React.FormEvent) {
		event.preventDefault();
		setTouched(true);
		if (!valid || !checkout || busy) return;
		const input: Checkout & { amountCents?: number } = subscription
			? { purpose: 'subscription', returnTo: checkout.returnTo }
			: { ...checkout, amountCents: cents };
		const signature = JSON.stringify(input);
		if (attempt.current?.input !== signature) attempt.current = { input: signature, key: uuid() };
		setBusy(true);
		setFailure(undefined);
		try {
			const { startCheckout, redirectToCheckout } = await import('@zivali/api/payments');
			const { paymentId, checkoutUrl } = await startCheckout(dispatch, {
				...input,
				locale,
				idempotencyKey: attempt.current.key,
			});
			onCheckout?.(paymentId);
			// The chosen amount, also for the monthly Podpornik (its checkout carries no amount until M4).
			track('begin_checkout', commerceParams({ purpose: input.purpose, amount_cents: cents, currency: 'EUR' }));
			// The page stays busy while the browser leaves for Checkout.
			redirectToCheckout(checkoutUrl);
		} catch (error) {
			tracker.current.error('amount', errorCode(error));
			// The monthly checkout answers 503 until its product exists (M4): calm, not INTERNAL.
			setFailure(
				subscription && (error as Partial<QueryError> | undefined)?.status === 503
					? tp('premium_unavailable')
					: errorText(error)
			);
			setBusy(false);
		}
	}

	return (
		<form noValidate onSubmit={pay}>
			<RadioGroupPrimitive.Root
				aria-label={t('amount_group')}
				value={choice}
				onValueChange={change(setChoice)}
				className={cn('flex flex-wrap gap-2', tip ? 'mt-5 lg:mt-6' : 'mt-4')}
			>
				{pills.map(([value, label]) => {
					const suggested = tip && value === SUGGESTED;
					return (
						<RadioGroupPrimitive.Item
							key={value}
							value={value}
							// "5 €, predlagano" as one name: Chrome reads an sr-only span as a block, "5 € , predlagano".
							aria-label={suggested ? `${label}, ${t('amount_suggested_a11y')}` : undefined}
							// The suggested amount: a 2 px primary line, never a fill or a check, so it never reads as chosen.
							className={cn(
								pillClass,
								'tabular-nums',
								suggested && 'inset-ring-2 inset-ring-primary data-[state=checked]:inset-ring-0'
							)}
						>
							<PillCheck />
							{label}
						</RadioGroupPrimitive.Item>
					);
				})}
				{tip && (
					<RadioGroupPrimitive.Item value="other" className={pillClass}>
						<PillCheck />
						{t('amount_other')}
					</RadioGroupPrimitive.Item>
				)}
			</RadioGroupPrimitive.Root>

			{choice === 'other' && (
				<FormField id={fieldId} label={t('amount_other_label')} error={fieldError} className="mt-5">
					<div className="relative">
						<Input
							value={other}
							onChange={(event) => change(setOther)(event.target.value)}
							onBlur={() => setTouched(true)}
							inputMode="decimal"
							autoComplete="off"
							className="pr-7 tabular-nums"
						/>
						<span
							aria-hidden="true"
							className="absolute top-1/2 right-0.5 -translate-y-1/2 text-lg text-muted-foreground"
						>
							€
						</span>
					</div>
				</FormField>
			)}

			{monthlyOffered && (
				<label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
					<Checkbox checked={monthly} onCheckedChange={(next) => change(setMonthly)(next === true)} />
					<span>{t('supporter_monthly_label')}</span>
				</label>
			)}

			{failure && (
				<div role="alert" className={cn(noteClass, 'mt-5')}>
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-destructive"
					/>
					<p>{failure}</p>
				</div>
			)}

			<div
				className={cn(
					'grid',
					tip ? 'gap-2 lg:grid-cols-2 lg:gap-3' : 'grid-cols-2 gap-3',
					failure ? 'mt-4' : tip ? 'mt-6' : 'mt-5'
				)}
			>
				<Button
					type="submit"
					variant="secondary"
					disabled={!valid || !checkout}
					loading={busy}
					aria-describedby={fieldError ? `${fieldId}-error` : help ? `${id}-help` : undefined}
				>
					{failure ? (
						<>
							<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
							{tc('try_again')}
						</>
					) : (
						payLabel
					)}
				</Button>
				{onSkip && (
					<Button type="button" variant="secondary" onClick={onSkip}>
						{t(tip ? 'skip' : 'contribution_hide')}
					</Button>
				)}
			</div>
			{help && (
				<p id={`${id}-help`} className="mt-2 text-sm text-muted-foreground">
					{help}
				</p>
			)}
			{tip && <p className="mt-4 text-sm text-muted-foreground">{t('not_donation_note')}</p>}
			{testMode &&
				(tip ? (
					<div className={cn(noteClass, 'mt-5')}>
						<FlaskIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
						<p>{t('test_note')}</p>
					</div>
				) : (
					<p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
						<FlaskIcon weight="bold" aria-hidden="true" className="size-4 shrink-0" />
						{t('test_note')}
					</p>
				))}
		</form>
	);
}
