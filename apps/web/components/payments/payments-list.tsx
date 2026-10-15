'use client';

import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';

import { useListMyPaymentsQuery } from '@zivali/api/payments';
import { formatDate, formatEur } from '@zivali/i18n/format';
import type { USER_AMOUNT_PURPOSES } from '@zivali/types';
import { InlineError } from '@/components/shell/page';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Settled payments only, each with its status as icon + word (system §10.5). Pending and cancelled checkouts charged
// nothing and are not payments the user made, so they are left out.
const STATUS = {
	succeeded: { label: 'status_paid', Icon: CheckCircleIcon, weight: 'fill', tone: '', icon: 'text-primary' },
	failed: { label: 'status_failed', Icon: WarningCircleIcon, weight: 'fill', tone: 'text-destructive', icon: '' },
	refunded: {
		label: 'status_refunded',
		Icon: ArrowUUpLeftIcon,
		weight: 'bold',
		tone: 'text-muted-foreground',
		icon: '',
	},
} as const;

/** The API's page cap (C13 GET /v1/me/payments, limit ≤ 50): more voluntary payments than that is not an M2 case. */
const LIMIT = 50;

/**
 * P15 W3 My payments: newest first, no cards or dividers, 20 px between rows; date · purpose · amount, localised
 * (formatDate, formatEur). `testMode` (outside production) labels every row "Testno". Receipts are emailed (the
 * receipt PDF comes with fiscal invoicing, TASK-92).
 */
export function PaymentsList({ testMode }: { testMode: boolean }) {
	const t = useTranslations('payments');
	const tCommon = useTranslations('common');
	const locale = useLocale();
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
			<div aria-busy="true" className="mt-8 grid gap-5 lg:mt-10">
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
				{['w-72', 'w-64', 'w-80'].map((width) => (
					<div key={width} className="grid gap-2">
						<Skeleton className={cn('h-6 max-w-full', width)} />
						<Skeleton className="h-5 w-32" />
					</div>
				))}
			</div>
		);
	}

	const rows = query.data.items.filter((payment) => Object.hasOwn(STATUS, payment.status));
	if (rows.length === 0) {
		return (
			<p className="mt-8 flex gap-3 text-muted-foreground lg:mt-10">
				<ReceiptIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
				{t('empty')}
			</p>
		);
	}

	return (
		<ul className="mt-8 grid gap-5 lg:mt-10">
			{rows.map((payment) => {
				const status = STATUS[payment.status as keyof typeof STATUS];
				return (
					<li key={payment.id}>
						<p className="tabular-nums">
							{t('row', {
								date: formatDate(payment.created_at, locale),
								// boost and subscription are refused until M4 (C13), so only the user-amount purposes occur.
								purpose: t(`purpose_${payment.purpose as (typeof USER_AMOUNT_PURPOSES)[number]}`),
								amount: formatEur(payment.amount_cents, locale),
							})}
						</p>
						<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
							<span
								className={cn(
									'inline-flex items-center gap-[5px] text-sm font-bold whitespace-nowrap',
									status.tone
								)}
							>
								<status.Icon
									weight={status.weight}
									aria-hidden="true"
									className={cn('size-4 shrink-0', status.icon)}
								/>
								{t(status.label)}
							</span>
							{testMode && (
								<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
									<FlaskIcon weight="bold" aria-hidden="true" className="size-4 shrink-0" />
									{t('test_label')}
								</span>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
