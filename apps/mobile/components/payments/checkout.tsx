import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { GlobeSimpleIcon } from 'phosphor-react-native/src/icons/GlobeSimple';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { ActivityIndicator, type Text as RNText, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { uuid } from '@zivali/api/client';
import { type StartCheckoutInput, startCheckout, useGetPaymentQuery } from '@zivali/api/payments';
import type { ApiStore } from '@zivali/api/rtk';
import type { Locale, PaymentStatus, Uuid } from '@zivali/types';
import { AuthNote, useErrorText } from '@/components/auth/parts';
import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { payInBrowser } from '@/lib/checkout';
import { cn } from '@/lib/utils';

/** What to pay (C13); the hand-off adds the locale, the app return and a fresh idempotency key per attempt. */
export type Checkout = Omit<StartCheckoutInput, 'locale' | 'returnScheme' | 'idempotencyKey'>;

type Step = { paymentId: Uuid; canceled: boolean } | null;

/**
 * P15 mobile checkout hand-off (A-014: web checkout, no native purchase UI). The sheet explains "Plačali boste v
 * brskalniku"; Nadaljuj creates the session and opens it in the in-app browser, and on the way back the same sheet
 * shows the return state over the screen the payment started from. Cancelled and failed start a new attempt.
 */
export function CheckoutSheet({
	open,
	onOpenChange,
	checkout,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	checkout: Checkout;
}) {
	const t = useTranslations('common');
	const [result, setResult] = React.useState<Step>(null);
	// Each opening starts at the hand-off.
	const [wasOpen, setWasOpen] = React.useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		if (open) setResult(null);
	}
	const close = () => onOpenChange(false);
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent closeLabel={t('close')}>
				{result ? (
					<CheckoutResult {...result} onClose={close} onRetry={() => setResult(null)} />
				) : (
					<Handoff checkout={checkout} onResult={setResult} onCancel={close} />
				)}
			</SheetContent>
		</Sheet>
	);
}

function Handoff({
	checkout,
	onResult,
	onCancel,
}: {
	checkout: Checkout;
	onResult: (result: NonNullable<Step>) => void;
	onCancel: () => void;
}) {
	const t = useTranslations('payments');
	const locale = useLocale() as Locale;
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	// One key per attempt: a retry after a network error reopens the same checkout session (C1, C13).
	const [idempotencyKey] = React.useState(uuid);
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string>();

	const pay = async () => {
		setBusy(true);
		setError(undefined);
		try {
			const { paymentId, checkoutUrl } = await startCheckout(dispatch, {
				...checkout,
				locale,
				returnScheme: true,
				idempotencyKey,
			});
			const { canceled } = await payInBrowser(checkoutUrl);
			onResult({ paymentId, canceled });
		} catch (failure) {
			setError(errorText(failure));
			setBusy(false);
		}
	};

	return (
		<>
			<View className="pt-3">
				<Spot icon={GlobeSimpleIcon} />
			</View>
			<Heading>{t('handoff_title')}</Heading>
			<Text className="mt-3 text-lg">{t('handoff_body')}</Text>
			{error ? <FieldError className="mt-4">{error}</FieldError> : null}
			<View className="gap-1 pt-8">
				<Button size="lg" loading={busy} onPress={pay}>
					<Icon as={ArrowSquareOutIcon} />
					{t('handoff_continue')}
				</Button>
				<Button variant="text" onPress={onCancel}>
					{t('handoff_cancel')}
				</Button>
			</View>
		</>
	);
}

type ResultView = 'success' | 'cancelled' | 'failed' | 'pending';

// A refund cannot come before the return; should it, nothing stays charged.
const VIEWS: Record<PaymentStatus, ResultView> = {
	pending: 'pending',
	succeeded: 'success',
	failed: 'failed',
	canceled: 'cancelled',
	refunded: 'cancelled',
};
const POLL_MS = 2000;

/**
 * P15 return states, from GET /v1/payments/:id (the webhook sets the status, C13): success (receipt sentence, or the
 * unconfirmed-email note), cancelled, failed, and pending, which polls until the webhook lands. A closed browser
 * (`canceled`) reads the status once, in case the payment went through just before. Screen reader focus moves to the
 * heading of each state. `onRetry` (the hand-off sheet) adds Poskusi znova / Poskusi z drugo kartico.
 */
export function CheckoutResult({
	paymentId,
	canceled,
	onClose,
	onRetry,
}: {
	paymentId: Uuid;
	canceled: boolean;
	onClose: () => void;
	onRetry?: () => void;
}) {
	const t = useTranslations();
	const errorText = useErrorText();
	const { isVerified } = useSession();
	const [settled, setSettled] = React.useState(canceled);
	const { data, error, refetch } = useGetPaymentQuery({ id: paymentId }, { pollingInterval: settled ? 0 : POLL_MS });
	const view: ResultView = data
		? canceled && data.status === 'pending'
			? 'cancelled'
			: VIEWS[data.status]
		: canceled
			? 'cancelled'
			: 'pending';
	if (!settled && view !== 'pending') setSettled(true);

	if (view === 'success')
		return (
			<View key={view}>
				<View className="pt-3">
					<Spot icon={CheckIcon} />
				</View>
				<Heading>{t('payments.success_title')}</Heading>
				{isVerified ? (
					<Text className="mt-3 text-lg">{t('payments.success_body')}</Text>
				) : (
					<AuthNote icon={EnvelopeSimpleIcon} className="mt-4">
						{t('support.unverified')}
					</AuthNote>
				)}
				<View className="pt-8">
					<Button size="lg" onPress={onClose}>
						{t('payments.success_back')}
					</Button>
				</View>
			</View>
		);

	if (view === 'cancelled')
		return (
			<View key={view}>
				<View className="pt-3">
					<View aria-hidden className="size-[88px] items-center justify-center rounded-full bg-muted">
						<Icon as={XIcon} size={40} className="text-muted-foreground" />
					</View>
				</View>
				<Heading>{t('payments.cancel_title')}</Heading>
				<Text className="mt-3 text-lg">{t('payments.cancel_body')}</Text>
				<View className="gap-1 pt-8">
					<Button size="lg" onPress={onClose}>
						{t('payments.cancel_back')}
					</Button>
					{onRetry ? (
						<Button variant="text" onPress={onRetry}>
							{t('payments.cancel_retry')}
						</Button>
					) : null}
				</View>
			</View>
		);

	if (view === 'failed')
		return (
			<View key={view}>
				<Heading className="mt-3">{t('payments.failed_title')}</Heading>
				<AuthNote icon={CreditCardIcon} className="mt-4">
					{t('payments.failed_body')}
				</AuthNote>
				<View className="gap-1 pt-8">
					{onRetry ? (
						<Button size="lg" onPress={onRetry}>
							{t('payments.failed_retry')}
						</Button>
					) : null}
					<Button variant="text" onPress={onClose}>
						{t('payments.failed_skip')}
					</Button>
				</View>
			</View>
		);

	return (
		<View key={view}>
			<View role="status" aria-live="polite" aria-busy>
				<View className="pt-3">
					<View aria-hidden className="size-[88px] items-center justify-center rounded-full bg-secondary">
						<ActivityIndicator size="large" className="text-primary" />
					</View>
				</View>
				<Heading>{t('payments.pending_title')}</Heading>
				<Text className="mt-3 text-lg">{t('payments.pending_body')}</Text>
			</View>
			{error && !data ? (
				<View className="mt-4 items-start">
					<FieldError>{errorText(error)}</FieldError>
					<Button variant="text" className="-ml-3" onPress={refetch}>
						{t('common.try_again')}
					</Button>
				</View>
			) : null}
			<View className="pt-8">
				<Button variant="text" onPress={onClose}>
					{t('payments.pending_back')}
				</Button>
			</View>
		</View>
	);
}

/** h2 of the hand-off and return states (24/30); screen reader focus lands on it when it appears. */
function Heading({ className, children }: { className?: string; children: string }) {
	const ref = useAccessibilityFocus<RNText>();
	return (
		<Text ref={ref} role="heading" className={cn('font-display text-2xl tracking-[-0.36px]', className ?? 'mt-6')}>
			{children}
		</Text>
	);
}
