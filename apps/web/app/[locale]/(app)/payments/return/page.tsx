import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { notFound } from 'next/navigation';

import { PaymentReturn } from '@/components/payments/payment-return';
import { getPathname } from '@/i18n/navigation';
import { requireViewer, safeNext } from '@/lib/viewer';

// The state's own title is set by the page once the payment is read.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Payments return (C15 paymentsReturn, /placila/zakljucek, /en/payments/return): where Checkout sends the payer
 * back, `?payment_id=…&return_to=…`, cancel adds `canceled=1` (C13). Signed-in accounts only; no ad slot (protected
 * flow). `return_to` is user input, so only a same-origin path passes; else home.
 */
export default async function PaymentsReturnPage({ params, searchParams }: PageProps<'/[locale]/payments/return'>) {
	const locale = (await params).locale as Locale;
	await requireViewer(locale);
	const { payment_id, return_to, canceled } = await searchParams;
	if (typeof payment_id !== 'string' || !UUID.test(payment_id)) notFound();

	return (
		<PaymentReturn
			paymentId={payment_id}
			returnTo={safeNext(return_to) ?? getPathname({ href: '/', locale })}
			canceled={canceled === '1'}
		/>
	);
}
