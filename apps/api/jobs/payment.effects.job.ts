// payment.effects (C13): after a payment succeeds, the payment_receipt notification; PaymentsDomain does the work.
import { PaymentsDomain } from '../domains/payments/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	await PaymentsDomain.paymentEffects(data, ctx);
}
