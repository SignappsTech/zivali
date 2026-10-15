// notify.send variables for payment_receipt (C10 fields: payment_id, amount_cents, purpose, paid_at, receipt_ref,
// is_test), loaded at send time from the job's payment_id. Null when the payment is gone, not the recipient's or no
// longer succeeded (refunded before delivery).
import { config } from '../../lib/config.ts';
import type { Source } from '../notifications/sources.ts';
import PaymentsDao from './payments.dao.ts';

export const paymentReceiptVars: Source = async ({ payment_id }, recipient) => {
	const payment = payment_id ? await PaymentsDao.getPayment(payment_id) : null;
	if (!payment || payment.user_id !== recipient.user_id || payment.status !== 'SUCCEEDED') return null;
	return {
		payment_id: payment.id,
		amount_cents: payment.amount_cents,
		purpose: payment.purpose.toLowerCase(),
		// Set by the succeeded move; the receipt claim follows within seconds.
		paid_at: payment.updated_at.toISOString(),
		receipt_ref: payment.id.slice(0, 8).toUpperCase(),
		// Live keys and livemode events are refused (C13), so today every payment is a test payment.
		is_test:
			config.APP_ENV !== 'production' ||
			payment.provider === 'mock' ||
			!/^(sk|rk)_live_/.test(config.STRIPE_SECRET_KEY ?? ''),
	};
};
