import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { env } from '@/lib/env';
import { safeNext } from '@/lib/viewer';

import { MockCheckout, StartPayment } from './checkout';

export const metadata: Metadata = { title: 'Mock checkout', robots: { index: false, follow: false } };

/**
 * C13 mock provider (TASK-32.2): the API's checkout_url is APP_URL/dev/checkout?payment_id=…, which shows that
 * session with Success, Fail and Cancel. Without a payment it starts one (amount and purpose), so the hand-off runs
 * end to end before any Stripe key exists. Not in production.
 */
export default async function CheckoutDevPage({ searchParams }: PageProps<'/[locale]/dev/checkout'>) {
	if (env.APP_ENV === 'production') notFound();
	const { payment_id, return_to } = await searchParams;

	return (
		<main id="main" className="mx-auto box-content grid max-w-[560px] gap-6 px-5 pt-8 pb-16">
			{typeof payment_id === 'string' ? (
				<MockCheckout paymentId={payment_id} returnTo={safeNext(return_to)} />
			) : (
				<StartPayment />
			)}
		</main>
	);
}
