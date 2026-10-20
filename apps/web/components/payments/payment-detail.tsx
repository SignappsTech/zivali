'use client';

import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';

import { invoicePdfPath, type PaymentView, useGetPaymentQuery } from '@zivali/api/payments';
import type { QueryError } from '@zivali/api/rtk';
import { formatDate, formatEur } from '@zivali/i18n/format';
import type { PaymentMethod } from '@zivali/types';
import {
	offState,
	type PaymentState,
	paymentState,
	StatusWord,
	TestNote,
	usePurpose,
} from '@/components/payments/payments-list';
import { h1Class, InlineError } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { accessToken, API_URL } from '@/lib/store';
import { cn } from '@/lib/utils';

/** "Not yours, or no such payment" (the API answers 404 for both; a malformed id is a 400): one not-found state. */
const MISSING = new Set(['NOT_FOUND', 'FORBIDDEN', 'VALIDATION']);

/** Stripe's lowercase brand codes as people know them; an unknown one shows capitalised. */
const BRANDS: Record<string, string> = {
	visa: 'Visa',
	mastercard: 'Mastercard',
	amex: 'American Express',
	diners: 'Diners Club',
	discover: 'Discover',
	jcb: 'JCB',
	unionpay: 'UnionPay',
	cartes_bancaires: 'Cartes Bancaires',
	eftpos_au: 'eftpos',
	interac: 'Interac',
};
const WALLETS = { apple_pay: 'Apple Pay', google_pay: 'Google Pay' } as const;

/** "Visa •••• 4242 (Google Pay)": brand and last 4 digits only (CH-701); null leaves the line out. */
export function methodText(method: PaymentMethod | null | undefined): string | null {
	if (!method) return null;
	const brand =
		method.type === 'link'
			? 'Link'
			: method.brand && (BRANDS[method.brand] ?? method.brand[0].toUpperCase() + method.brand.slice(1));
	const card = [brand, method.last4 && `•••• ${method.last4}`].filter(Boolean).join(' ');
	const wallet = method.wallet && WALLETS[method.wallet];
	return card && wallet ? `${card} (${wallet})` : card || wallet || null;
}

/**
 * P15 payment detail (wireframe P15-my-payments v1, F2), in the list's 640 px column: back link "Vsa plačila", h1 =
 * purpose, the amount large with one status word, the test note, one card with the facts, then the receipt in its own
 * card. Not found (someone else's or no such payment, pending or cancelled checkouts too) keeps the back link.
 */
export function PaymentDetail({ id }: { id: string }) {
	const t = useTranslations('payments');
	const tCommon = useTranslations('common');
	const query = useGetPaymentQuery({ id });
	const payment = query.currentData;
	const state = payment && paymentState(payment);

	let body: ReactNode;
	if (payment && state) body = <Loaded payment={payment} state={state} />;
	else if (payment || (query.isError && MISSING.has((query.error as QueryError).data?.code)))
		body = (
			<>
				<h1 className={cn(h1Class, 'mt-2')}>{t('detail_not_found_title')}</h1>
				<p className="mt-4">{t('detail_not_found_body')}</p>
			</>
		);
	else if (query.isError)
		body = (
			<div className="mt-4">
				<InlineError onRetry={query.refetch} retrying={query.isFetching} />
			</div>
		);
	else
		body = (
			<div aria-busy="true">
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
				<Skeleton className="mt-2 h-9 w-[70%] lg:h-[52px]" />
				<Skeleton className="mt-4 h-12 w-[180px] lg:h-14" />
				<Skeleton className="mt-2 h-5 w-24" />
				<div className="mt-6 grid gap-4 rounded-card bg-card p-5 lg:p-6">
					<Skeleton className="h-[22px] w-4/5" />
					<Skeleton className="h-[22px] w-3/5" />
				</div>
			</div>
		);

	return (
		<div className="mx-auto max-w-[640px]">
			<Button asChild variant="text" className="-ml-1 pl-1">
				<Link href="/account/payments">
					<CaretLeftIcon weight="bold" aria-hidden="true" />
					{t('detail_back')}
				</Link>
			</Button>
			{body}
		</div>
	);
}

function Loaded({ payment, state }: { payment: PaymentView; state: PaymentState }) {
	const t = useTranslations('payments');
	const locale = useLocale();
	const purpose = usePurpose();
	const method = methodText(payment.method);

	const facts: [string, ReactNode][] = [
		[
			t('detail_date'),
			t('detail_date_time', {
				date: formatDate(payment.created_at, locale),
				time: formatDate(payment.created_at, locale, 'time'),
			}),
		],
	];
	if (method) facts.push([t('detail_method'), method]);
	if (payment.refunded_cents > 0)
		facts.push(
			[t('detail_paid'), formatEur(payment.amount_cents, locale)],
			[
				t('detail_refunded'),
				<>
					{[
						formatEur(payment.refunded_cents, locale),
						payment.refunded_at && formatDate(payment.refunded_at, locale),
					]
						.filter(Boolean)
						.join(' · ')}
					<span className="mt-1 block text-sm text-muted-foreground">{t('detail_refund_note')}</span>
				</>,
			]
		);

	return (
		<>
			<h1 className={cn(h1Class, 'mt-2')}>{purpose(payment)}</h1>
			<p
				className={cn(
					'mt-4 font-display text-[40px] leading-[48px] font-bold tracking-[-0.02em] tabular-nums lg:text-5xl lg:leading-[56px]',
					offState(state) && 'text-muted-foreground'
				)}
			>
				{formatEur(payment.amount_cents, locale)}
			</p>
			<p className="mt-1">
				<StatusWord state={state} large />
			</p>
			{state === 'failed' && <p className="mt-2">{t('detail_failed')}</p>}
			{payment.test && <TestNote className="mt-6">{t('detail_test_note')}</TestNote>}
			<dl className="mt-6 grid gap-4 rounded-card bg-card p-5 text-card-foreground lg:p-6">
				{facts.map(([label, value]) => (
					<div key={label} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[168px_minmax(0,1fr)]">
						<dt className="text-sm leading-6 font-bold text-muted-foreground">{label}</dt>
						<dd className="tabular-nums">{value}</dd>
					</div>
				))}
			</dl>
			{state !== 'failed' && <Receipt payment={payment} />}
		</>
	);
}

/**
 * The receipt (TASK-32.9, moved here from the list): the number and the PDF only with `invoice.pdf_ready`; not ready
 * yet, one sentence and the email line when `receipt_sent_at` is set. Neither: no section. The fiscal status is not
 * shown. The PDF route wants the session's token, so it is fetched and saved as a file, not linked.
 */
function Receipt({ payment }: { payment: PaymentView }) {
	const t = useTranslations('payments');
	const headingId = useId();
	const [download, setDownload] = useState<'idle' | 'busy' | 'failed'>('idle');
	const { invoice, receipt_sent_at: sentAt } = payment;
	if (!invoice && !sentAt) return null;

	const save = async () => {
		if (!invoice) return;
		setDownload('busy');
		try {
			const token = await accessToken();
			const response = await fetch(`${API_URL}${invoicePdfPath(payment.id)}`, {
				headers: token ? { Authorization: `Bearer ${token}` } : undefined,
			});
			if (!response.ok) throw new Error(`receipt ${response.status}`);
			const file = URL.createObjectURL(await response.blob());
			const link = Object.assign(document.createElement('a'), {
				href: file,
				download: `${t('receipt')}-${invoice.number}.pdf`,
			});
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(file), 10_000);
			setDownload('idle');
		} catch {
			setDownload('failed');
		}
	};

	return (
		<section aria-labelledby={headingId} className="mt-10">
			<h2 id={headingId} className="font-display text-2xl font-bold tracking-[-0.015em] lg:text-3xl">
				{t('receipt')}
			</h2>
			<div className="mt-4 grid justify-items-start gap-3 rounded-card bg-card p-5 text-card-foreground lg:p-6">
				{invoice?.pdf_ready ? (
					<>
						<p className="font-bold">{t('receipt_number', { number: invoice.number })}</p>
						<Button
							variant="secondary"
							loading={download === 'busy'}
							onClick={save}
							className="w-full sm:w-auto"
						>
							<DownloadSimpleIcon weight="bold" aria-hidden="true" />
							{t('receipt_download')}
						</Button>
						{download === 'failed' && (
							<div className="w-full">
								<InlineError />
							</div>
						)}
						{invoice.test && (
							<p className="flex gap-2 text-sm text-muted-foreground">
								<FlaskIcon weight="bold" aria-hidden="true" className="size-5 shrink-0" />
								{t('receipt_test')}
							</p>
						)}
					</>
				) : (
					<>
						{invoice && <p>{t('receipt_pending')}</p>}
						{sentAt && (
							<p className="flex gap-2 text-sm text-muted-foreground">
								<ReceiptIcon weight="bold" aria-hidden="true" className="size-5 shrink-0" />
								{t('receipt_sent')}
							</p>
						)}
					</>
				)}
			</div>
		</section>
	);
}
