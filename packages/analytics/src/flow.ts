// Tracking plan v2 helpers (C12 §API, C12b §2, §6): step and error events for one mounted flow, and the GA4
// commerce parameters for begin_checkout / purchase. Pure TypeScript: a component keeps one tracker in a ref.
import type { PaymentPurpose } from '@zivali/types';

import { track } from './index.ts';
import type { ErrorCodeParam, EventParams, Flow, StepOf } from './registry.ts';

type Dwell = NonNullable<EventParams['flow_step']['dwell']>;
type StepExtra = Pick<EventParams['flow_step'], 'species' | 'report_type' | 'municipality'>;

// Upper bounds in seconds (exclusive) of the C12 §Parameters dwell buckets.
const DWELL: [number, Dwell][] = [
	[10, '0-9'],
	[30, '10-29'],
	[60, '30-59'],
	[180, '60-179'],
];
const dwellOf = (seconds: number): Dwell => DWELL.find(([max]) => seconds < max)?.[1] ?? '180+';

// Monotonic, so a clock change cannot produce a negative or huge dwell.
const now = () => performance.now();

/** One per mounted flow instance (a new instance restarts `dwell`); both calls are no-ops without consent. */
export function flowTracker<F extends Flow>(flow: F) {
	let current: StepOf<F> | undefined;
	let since = 0;
	return {
		/** `flow_step` when a step shows, with the bucketed time on the previous step; the same step twice in a row is not resent. */
		step(step: StepOf<F>, extra: StepExtra = {}): void {
			if (step === current) return;
			const at = now();
			const dwell = current === undefined ? {} : { dwell: dwellOf((at - since) / 1000) };
			current = step;
			since = at;
			track('flow_step', { ...extra, flow, step, ...dwell } as EventParams['flow_step']);
		},
		/** One `flow_error` per refused attempt: the first invalid field's form key (never its value) and a C12b §4 code. */
		error(step: StepOf<F>, code: ErrorCodeParam, field?: string): void {
			const error_field = field === undefined ? {} : { error_field: field };
			track('flow_error', { flow, step, error_code: code, ...error_field } as EventParams['flow_error']);
		},
	};
}

/** C12b §6: the GA4 commerce parameters of one payment, for `begin_checkout` and `purchase` (value in EUR, 2 decimals). */
export function commerceParams(payment: {
	purpose: PaymentPurpose;
	amount_cents: number;
	currency: 'EUR';
	plan?: 'monthly' | 'yearly';
}): EventParams['purchase'] {
	const { purpose, amount_cents, currency, plan } = payment;
	return { value: Math.round(amount_cents) / 100, currency, purpose, ...(plan && { plan }) };
}
