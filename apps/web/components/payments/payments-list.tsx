'use client';

import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { type PaymentView, useListMyPaymentsQuery } from '@zivali/api/payments';
import { formatDate, formatEur } from '@zivali/i18n/format';
import type { USER_AMOUNT_PURPOSES } from '@zivali/types';
import { InlineError, ringClass } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// Settled payments only, each with its status as icon + word (system §10.5). Pending and cancelled checkouts charged
// nothing and are not payments the user made, so they are left out (the list and the detail alike).
const STATUS = {
	paid: { label: 'status_paid', Icon: CheckCircleIcon, weight: 'fill', tone: '', icon: 'text-primary' },
	partial: {
		label: 'status_refunded_partial',
		Icon: ArrowUUpLeftIcon,
		weight: 'bold',
		tone: 'text-muted-foreground',
		icon: '',
	},
	refunded: {
		label: 'status_refunded',
		Icon: ArrowUUpLeftIcon,
		weight: 'bold',
		tone: 'text-muted-foreground',
		icon: '',
	},
	failed: { label: 'status_failed', Icon: WarningCircleIcon, weight: 'fill', tone: 'text-destructive', icon: '' },
} as const;
export type PaymentState = keyof typeof STATUS;

/** One status word per payment: a partial refund keeps the payment paid, and says "Delno vrnjeno" (P15 Q5). */
export function paymentState({ status, refunded_cents }: PaymentView): PaymentState | undefined {
	if (status === 'succeeded') return refunded_cents > 0 ? 'partial' : 'paid';
	if (status === 'failed' || status === 'refunded') return status;
}

/** Failed and fully refunded amounts cost nothing now, so they are muted. */
export const offState = (state: PaymentState) => state === 'failed' || state === 'refunded';

/** Until the API sends the payment's own flag (CH-702), the environment decides. */
export const isTest = (payment: PaymentView, testMode: boolean) => payment.test ?? testMode;

export function usePurpose() {
	const t = useTranslations('payments');
	// boost and subscription are refused until M4 (C13), so only the user-amount purposes occur.
	return (payment: PaymentView) => t(`purpose_${payment.purpose as (typeof USER_AMOUNT_PURPOSES)[number]}`);
}

/** Status word (system §10.5): fill icon 16 + 14 bold; `large` (the detail) icon 20 + 16. */
export function StatusWord({ state, large = false }: { state: PaymentState; large?: boolean }) {
	const t = useTranslations('payments');
	const status = STATUS[state];
	return (
		<span
			className={cn(
				'inline-flex items-center font-bold whitespace-nowrap',
				large ? 'gap-1.5 text-base' : 'gap-[5px] text-sm',
				status.tone
			)}
		>
			<status.Icon
				weight={status.weight}
				aria-hidden="true"
				className={cn('shrink-0', large ? 'size-5' : 'size-4', status.icon)}
			/>
			{t(status.label)}
		</span>
	);
}

/** Note (system §10.6): muted surface, radius 20, icon 22 + 15/22 text; one per view. */
export function TestNote({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={cn('flex gap-3 rounded-row bg-muted px-5 py-4 text-control leading-[22px]', className)}>
			<FlaskIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<p>{children}</p>
		</div>
	);
}

/** The API's page cap (C13 GET /v1/me/payments, limit ≤ 50): more voluntary payments than that is not an M2 case. */
const LIMIT = 50;

/**
 * P15 W3 My payments (wireframe P15-my-payments v1, F1): newest first, one card row per payment (radius 20, 12 px
 * apart, no border); purpose and date left, amount and one status word right, a caret, and the whole row is one link
 * to the payment's detail. One test note above the list instead of a label per row. The receipt is in the detail.
 */
export function PaymentsList({ testMode }: { testMode: boolean }) {
	const t = useTranslations('payments');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const purpose = usePurpose();
	const query = useListMyPaymentsQuery({ limit: LIMIT });

	if (query.isError) {
		return (
			<div className="mt-8 lg:mt-10">
				<InlineError onRetry={query.refetch} retrying={query.isFetching} />
			</div>
		);
	}
	if (!query.data) {
		return (
			<div aria-busy="true" className="mt-8 grid gap-3 lg:mt-10">
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
				{['w-[62%]', 'w-[48%]', 'w-[70%]'].map((width) => (
					<div
						key={width}
						className="flex min-h-[76px] items-center gap-4 rounded-row bg-card py-3.5 pr-3 pl-5"
					>
						<div className="grid flex-1 gap-1.5">
							<Skeleton className={cn('h-[22px]', width)} />
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="grid justify-items-end gap-1.5">
							<Skeleton className="h-[22px] w-16" />
							<Skeleton className="h-4 w-20" />
						</div>
					</div>
				))}
			</div>
		);
	}

	const rows = query.data.items.flatMap((payment) => {
		const state = paymentState(payment);
		return state ? [{ payment, state }] : [];
	});
	if (rows.length === 0) {
		return (
			<p className="mt-8 flex gap-3 text-muted-foreground lg:mt-10">
				<ReceiptIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
				{t('empty')}
			</p>
		);
	}

	const test = rows.some(({ payment }) => isTest(payment, testMode));
	return (
		<>
			{test && <TestNote className="mt-8 lg:mt-10">{t('test_note_list')}</TestNote>}
			<ul aria-label={t('list_title')} className={cn('grid gap-3', test ? 'mt-6' : 'mt-8 lg:mt-10')}>
				{rows.map(({ payment, state }) => (
					<li key={payment.id}>
						<Link
							href={{ pathname: '/account/payments/[id]', params: { id: payment.id } }}
							className={cn(
								'flex min-h-[76px] items-center gap-3 rounded-row bg-card py-3.5 pr-2 pl-4 text-card-foreground transition-transform duration-150 hover:bg-[color-mix(in_srgb,hsl(var(--card))_90%,hsl(var(--foreground)))] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:gap-4 sm:pr-3 sm:pl-5',
								ringClass
							)}
						>
							<span className="grid min-w-0 flex-1 gap-0.5">
								<span className="text-control-lg font-bold">{purpose(payment)}</span>
								<span className="text-sm text-muted-foreground tabular-nums">
									{formatDate(payment.created_at, locale)}
								</span>
							</span>
							<span className="grid justify-items-end gap-0.5 text-right">
								<span
									className={cn(
										'text-control-lg whitespace-nowrap tabular-nums',
										offState(state) ? 'text-muted-foreground' : 'font-bold'
									)}
								>
									{formatEur(payment.amount_cents, locale)}
								</span>
								<StatusWord state={state} />
							</span>
							<CaretRightIcon
								weight="bold"
								aria-hidden="true"
								className="size-5 shrink-0 text-muted-foreground"
							/>
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
