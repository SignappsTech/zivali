'use client';

import { FlaskIcon } from '@phosphor-icons/react/dist/ssr/Flask';
import { useLocale } from 'next-intl';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { formatEur } from '@zivali/i18n/format';
import { redirectToCheckout, startCheckout, useGetPaymentQuery } from '@zivali/api/payments';
import type { ApiStore } from '@zivali/api/rtk';
import { useErrorText } from '@/components/auth/parts';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { type MockCheckoutState, sendMockEvent } from './actions';

// Dev-only page (C13 mock provider), so its own words are English; API errors use the errors.* copy.

const h1 = 'font-display text-3xl font-bold tracking-[-0.02em]';

function TestNote() {
	return (
		<div className={noteClass}>
			<FlaskIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
			<p>Mock provider: no card and no Stripe. The API receives a signed webhook event.</p>
		</div>
	);
}

/** The mock Checkout session of one payment: Success, Fail and Cancel post the signed event, then return. */
export function MockCheckout({ paymentId, returnTo }: { paymentId: string; returnTo?: string }) {
	const locale = useLocale();
	const [state, action, pending] = React.useActionState<MockCheckoutState, FormData>(sendMockEvent, null);
	// Owner only: shows the amount when the payer is signed in here.
	const { data: payment } = useGetPaymentQuery({ id: paymentId });

	return (
		<>
			<h1 className={h1}>Mock checkout</h1>
			<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
				<dt className="text-muted-foreground">Payment</dt>
				<dd className="break-all tabular-nums">{paymentId}</dd>
				{payment && (
					<>
						<dt className="text-muted-foreground">Amount</dt>
						<dd className="tabular-nums">
							{formatEur(payment.amount_cents, locale)} · {payment.purpose} · {payment.status}
						</dd>
					</>
				)}
			</dl>
			<TestNote />
			<form action={action} aria-busy={pending || undefined} className="flex flex-wrap gap-3">
				<input type="hidden" name="payment_id" value={paymentId} />
				{returnTo && <input type="hidden" name="return_to" value={returnTo} />}
				<Button type="submit" name="outcome" value="success" disabled={pending}>
					Success
				</Button>
				<Button type="submit" name="outcome" value="fail" variant="secondary" disabled={pending}>
					Fail
				</Button>
				<Button type="submit" name="outcome" value="cancel" variant="secondary" disabled={pending}>
					Cancel
				</Button>
			</form>
			{state?.failed && (
				<p role="alert" className="text-destructive">
					The API did not take the mock event. Is it running with PAYMENTS_PROVIDER=mock?
				</p>
			)}
		</>
	);
}

/** Starts a user-chosen payment (C13 startCheckout) against the configured API, which hands back its checkout URL. */
export function StartPayment() {
	const locale = useLocale();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	const [purpose, setPurpose] = React.useState<'tip' | 'support'>('support');
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const euros = Number(String(new FormData(event.currentTarget).get('amount')).replace(',', '.'));
		setBusy(true);
		setError(undefined);
		try {
			const { checkoutUrl } = await startCheckout(dispatch, {
				purpose,
				amountCents: Math.round(euros * 100),
				returnTo: window.location.pathname,
				locale,
			});
			redirectToCheckout(checkoutUrl);
		} catch (caught) {
			setError(errorText(caught));
			setBusy(false);
		}
	}

	return (
		<>
			<h1 className={h1}>Start a test payment</h1>
			<TestNote />
			<form onSubmit={submit} noValidate className="grid gap-6">
				<fieldset>
					<legend className="mb-1 text-control font-bold">Purpose</legend>
					<RadioGroup
						value={purpose}
						onValueChange={(value) => setPurpose(value as typeof purpose)}
						className="flex flex-wrap gap-x-8"
					>
						{(['support', 'tip'] as const).map((value) => (
							<Label
								key={value}
								className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold"
							>
								<RadioGroupItem value={value} />
								{value}
							</Label>
						))}
					</RadioGroup>
				</fieldset>
				<FormField label="Amount in euros" error={error}>
					<Input name="amount" inputMode="decimal" defaultValue="5" autoComplete="off" />
				</FormField>
				<Button type="submit" loading={busy} className="justify-self-start">
					Go to checkout
				</Button>
			</form>
		</>
	);
}
