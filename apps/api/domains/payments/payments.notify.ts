// notify.send variables for payment_receipt (C10 fields: payment_id, amount_cents, purpose, paid_at, receipt_ref,
// is_test; TASK-92: has_invoice, invoice_number, zoi, has_eor, eor), loaded at send time from the job's payment_id. Null when the payment is gone, not the recipient's or no
// longer succeeded (refunded before delivery).
import { config } from '../../lib/config.ts';
import type { Source } from '../notifications/sources.ts';
import PaymentsDao from './payments.dao.ts';

export const paymentReceiptVars: Source = async ({ payment_id }, recipient) => {
	const payment = payment_id ? await PaymentsDao.getPayment(payment_id) : null;
	if (!payment || payment.user_id !== recipient.user_id || payment.status !== 'SUCCEEDED') return null;
	// payment.effects issues the fiscal invoice before it queues the receipt (TASK-92); none when fiscal invoicing is off.
	const invoice = await PaymentsDao.getInvoiceByPayment(payment.id);
	return {
		has_invoice: !!invoice,
		...(invoice && { invoice_number: invoice.number, zoi: invoice.zoi }),
		has_eor: !!invoice?.eor,
		...(invoice?.eor && { eor: invoice.eor }),
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
