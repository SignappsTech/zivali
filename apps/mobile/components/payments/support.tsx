import { skipToken } from '@reduxjs/toolkit/query';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { FlaskIcon } from 'phosphor-react-native/src/icons/Flask';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { useGetPublicConfigQuery } from '@zivali/api/config';
import { formatEur, type Locale } from '@zivali/i18n/format';
import { type Checkout, CheckoutSheet } from '@/components/payments/checkout';
import { Note } from '@/components/report-lost/parts';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

// P15 support moments: the thank-you tip (reunited screen), the contribution row (lost confirmation) and the Profile
// card. Voluntary and quiet: nothing pre-selected, Skip as visible as Pay, payment only through the web checkout
// (ADR-011), never for anonymous finders, and nothing here holds back reporting, matching or alerts.

const MIN_CENTS = 200;
const MAX_CENTS = 50_000;
const SUGGESTED = 5;

type Answer = 'skipped' | 'paid';
// Asks answered this app session, per moment and report: skipped or paid, a report is never asked twice. A tiny store
// so siblings (the reunited ad) re-render when the ask is skipped or paid.
const answered = new Map<string, Answer>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => void listeners.delete(listener);
};

function useAnswer(key: string) {
	const answer = React.useSyncExternalStore(
		subscribe,
		() => answered.get(key),
		() => undefined
	);
	const record = (next: Answer) => {
		answered.set(key, next);
		listeners.forEach((l) => l());
	};
	return [answer, record] as const;
}

/** "Drug znesek" in integer cents: accepts "2,5" and "2.5"; undefined when it is not a plain decimal (max 2 places). */
function toCents(text: string): number | undefined {
	const s = text.trim();
	return /^\d+([.,]\d{1,2})?$/.test(s) ? Math.round(Number(s.replace(',', '.')) * 100) : undefined;
}

/**
 * The amount pills (a radiogroup, none chosen), "Drug znesek" with the 2 to 500 € check (tip), the unticked monthly
 * box when `flags.supporter_monthly` is on (tip), Pay and Skip of the same variant and size, and the hand-off sheet.
 * `onPaid` runs when the sheet closes after a successful payment. Without `checkout` Pay waits (report not loaded).
 */
function AmountAsk({
	kind,
	checkout,
	onSkip,
	onPaid,
}: {
	kind: 'tip' | 'contribution';
	checkout?: Omit<Checkout, 'amountCents'>;
	onSkip?: () => void;
	onPaid?: () => void;
}) {
	const t = useTranslations('support');
	const locale = useLocale() as Locale;
	const tip = kind === 'tip';
	const { data: config } = useGetPublicConfigQuery(tip ? undefined : skipToken);
	const monthlyOffered = tip && config?.['flags.supporter_monthly'] === true;
	const [choice, setChoice] = React.useState<number | 'other'>();
	const [other, setOther] = React.useState('');
	const [touched, setTouched] = React.useState(false);
	const [monthly, setMonthly] = React.useState(false);
	const [paying, setPaying] = React.useState(false);
	const paid = React.useRef(false);

	const pills = tip
		? ([
				[3, t('amount_3')],
				[5, t('amount_5')],
				[10, t('amount_10')],
			] as const)
		: ([
				[2, t('contribution_2')],
				[3, t('contribution_3')],
				[5, t('contribution_5')],
			] as const);
	const cents = choice === 'other' ? toCents(other) : choice && choice * 100;
	const valid = cents !== undefined && cents >= MIN_CENTS && cents <= MAX_CENTS;
	const error =
		choice === 'other' && touched && other.trim() && !valid
			? t(cents !== undefined && cents > MAX_CENTS ? 'amount_max_error' : 'amount_min_error')
			: undefined;
	const amount = valid ? formatEur(cents, locale) : '';
	const payLabel = !valid
		? t(tip ? 'pay_disabled' : 'contribution_pay_disabled')
		: monthly && monthlyOffered
			? t('supporter_monthly_label')
			: t(tip ? 'pay' : 'contribution_pay', { amount });
	const help = valid || error ? undefined : t('pay_disabled_help');
	const markPaid = React.useCallback(() => {
		paid.current = true;
	}, []);
	const onSheet = (open: boolean) => {
		setPaying(open);
		if (!open && paid.current) onPaid?.();
	};

	return (
		<>
			<View
				role="radiogroup"
				aria-label={t('amount_group')}
				className={cn('flex-row flex-wrap gap-2', tip ? 'mt-5' : 'mt-4')}
			>
				{pills.map(([euros, label]) => {
					const suggested = tip && euros === SUGGESTED && choice !== euros;
					return (
						<Pill
							key={euros}
							role="radio"
							selected={choice === euros}
							aria-label={
								tip && euros === SUGGESTED ? `${label}, ${t('amount_suggested_a11y')}` : undefined
							}
							// The suggested amount: a 2 px primary line, never a fill or a check, so it never reads as chosen.
							className={suggested ? 'border-2 border-primary px-4' : undefined}
							onPress={() => setChoice(euros)}
						>
							{label}
						</Pill>
					);
				})}
				{tip ? (
					<Pill role="radio" selected={choice === 'other'} onPress={() => setChoice('other')}>
						{t('amount_other')}
					</Pill>
				) : null}
			</View>
			{choice === 'other' ? (
				<FormField label={t('amount_other_label')} error={error} className="mt-5">
					<View className="justify-center">
						<Input
							value={other}
							onChangeText={setOther}
							onBlur={() => setTouched(true)}
							keyboardType="decimal-pad"
							inputMode="decimal"
							autoComplete="off"
							className="pr-7 tabular-nums"
						/>
						<Text aria-hidden className="absolute right-0.5 text-lg text-muted-foreground">
							€
						</Text>
					</View>
				</FormField>
			) : null}
			{monthlyOffered ? (
				<Checkbox
					className="mt-4"
					checked={monthly}
					onCheckedChange={setMonthly}
					label={t('supporter_monthly_label')}
				/>
			) : null}
			<View className={tip ? 'mt-6 gap-2' : 'mt-5 flex-row gap-3'}>
				<Button
					variant="secondary"
					disabled={!valid || !checkout}
					accessibilityHint={error ?? help}
					onPress={() => setPaying(true)}
					className={tip ? undefined : 'flex-1'}
				>
					{payLabel}
				</Button>
				{onSkip ? (
					<Button variant="secondary" onPress={onSkip} className={tip ? undefined : 'flex-1'}>
						{t(tip ? 'skip' : 'contribution_hide')}
					</Button>
				) : null}
			</View>
			{help ? (
				<Text aria-hidden className="mt-2 text-sm text-muted-foreground">
					{help}
				</Text>
			) : null}
			{tip ? <Text className="mt-4 text-sm text-muted-foreground">{t('not_donation_note')}</Text> : null}
			{env.EXPO_PUBLIC_APP_ENV === 'production' ? null : tip ? (
				<Note icon={FlaskIcon} className="mt-5">
					{t('test_note')}
				</Note>
			) : (
				<View className="mt-3 flex-row items-center gap-1.5">
					<Icon as={FlaskIcon} size={16} className="text-muted-foreground" />
					<Text className="shrink text-sm text-muted-foreground">{t('test_note')}</Text>
				</View>
			)}
			{valid && checkout ? (
				<CheckoutSheet
					open={paying}
					onOpenChange={onSheet}
					onPaid={markPaid}
					checkout={
						monthly && monthlyOffered
							? { purpose: 'subscription', returnTo: checkout.returnTo }
							: { ...checkout, amountCents: cents }
					}
				/>
			) : null}
		</>
	);
}

/** P15 B6: replaces the tip block or the contribution row once this report has a contribution. */
function AlreadyPaid({ className }: { className?: string }) {
	const t = useTranslations('support');
	return (
		<View className={cn('flex-row gap-3', className)}>
			<Icon as={CheckCircleIcon} weight="fill" size={22} className="text-primary" />
			<Text className="min-w-0 flex-1">{t('already_paid')}</Text>
		</View>
	);
}

/**
 * Payments on (C13 §Payments off, TASK-76.1): off with EXPO_PUBLIC_PAYMENTS_ENABLED=false in the build, or once the API
 * reports `payments.enabled: false` (PAYMENTS_PROVIDER=off). On while the config loads or cannot be read.
 */
function usePaymentsOn() {
	const reported = useGetPublicConfigQuery().data?.['payments.enabled'];
	return env.EXPO_PUBLIC_PAYMENTS_ENABLED && reported !== false;
}

/**
 * Signed-in accounts only: an anonymous finder or a signed-out visitor never sees an ask, and nobody does while payments
 * are off.
 */
function useCanAsk() {
	const { me, isAnonymous } = useSession();
	return usePaymentsOn() && Boolean(me) && !isAnonymous;
}

/**
 * State of the reunited tip ask for a report: 'asking' (shown), 'skipped', 'paid', or 'none' when no ask is possible
 * (signed out, anonymous or payments off). Shares SupportTip's store, so a sibling re-renders when the ask is skipped
 * or paid.
 */
export function useSupportTipState(code: string): 'asking' | 'skipped' | 'paid' | 'none' {
	const canAsk = useCanAsk();
	const [answer] = useAnswer(`tip:${code}`);
	return canAsk ? (answer ?? 'asking') : 'none';
}

/** P14/P15 thank-you tip on the reunited screen: h3, one sentence, 3, 5 (suggested) or 10 € or another amount. */
export function SupportTip({ reportId, code, className }: { reportId: string; code: string; className?: string }) {
	const t = useTranslations('support');
	const canAsk = useCanAsk();
	const [answer, setAnswer] = useAnswer(`tip:${code}`);
	if (!canAsk || answer === 'skipped') return null;
	if (answer === 'paid') return <AlreadyPaid className={className} />;
	return (
		<View className={className}>
			<Text role="heading" className="font-display-semibold text-xl tracking-[-0.2px]">
				{t('tip_title')}
			</Text>
			<Text className="mt-2">{t('tip_body')}</Text>
			<AmountAsk
				kind="tip"
				checkout={{ purpose: 'tip', refs: { report_id: reportId }, returnTo: `/r/${code}/reunited` }}
				onSkip={() => setAnswer('skipped')}
				onPaid={() => setAnswer('paid')}
			/>
		</View>
	);
}

/**
 * Profile card "Pomagajte nam izboljšati Najdimo" (C13 `support`): the tip's amounts, no Skip, never a prompt; none
 * while payments are off.
 */
export function SupportCard({ className }: { className?: string }) {
	const t = useTranslations('support');
	if (!usePaymentsOn()) return null;
	return (
		<Card className={className}>
			<CardTitle>{t('card_title')}</CardTitle>
			<Text className="mt-2">{t('card_body')}</Text>
			<AmountAsk kind="tip" checkout={{ purpose: 'support', returnTo: '/account/payments' }} />
		</Card>
	);
}

/**
 * P15 contribution at the lost confirmation: a collapsed row (text and caret); open, the 2, 3 and 5 € pills with none
 * chosen, then Prispevaj and Skrij side by side. Skrij or a payment ends the ask for this report.
 */
export function ContributionRow({
	reportId,
	code,
	className,
}: {
	reportId?: string;
	code: string;
	className?: string;
}) {
	const t = useTranslations('support');
	const canAsk = useCanAsk();
	const [open, setOpen] = React.useState(false);
	const [answer, setAnswer] = useAnswer(`report_contribution:${code}`);
	if (!canAsk || answer === 'skipped') return null;
	if (answer === 'paid') return <AlreadyPaid className={className} />;
	const title = t('contribution_row');
	return (
		<View className={className}>
			<Pressable
				role="button"
				aria-expanded={open}
				aria-label={open ? title : `${title}. ${t('contribution_expand_a11y')}`}
				onPress={() => setOpen(!open)}
				className="-mx-3 min-h-14 flex-row items-center gap-3 rounded-row px-3 active:bg-foreground/10"
			>
				<Icon as={HeartIcon} size={20} className="text-muted-foreground" />
				<Text className="min-w-0 flex-1 font-sans-semibold">{title}</Text>
				<Icon as={open ? CaretUpIcon : CaretDownIcon} size={20} className="text-muted-foreground" />
			</Pressable>
			{open ? (
				<>
					<Text className="mt-2">{t('contribution_body')}</Text>
					<AmountAsk
						kind="contribution"
						checkout={
							reportId
								? {
										purpose: 'report_contribution',
										refs: { report_id: reportId },
										returnTo: `/r/${code}`,
									}
								: undefined
						}
						onSkip={() => setAnswer('skipped')}
						onPaid={() => setAnswer('paid')}
					/>
				</>
			) : null}
		</View>
	);
}
