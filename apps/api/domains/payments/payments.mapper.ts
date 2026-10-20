// Payment DTO (C13): lowercase enums, ISO timestamps; provider ids, refs and the user id stay server-side.
import type { z } from 'zod';

import { Payment } from '@zivali/validation';

import type { PaymentRow } from './payments.dao.ts';

export function toPaymentDto(row: PaymentRow): z.infer<typeof Payment> {
	return Payment.parse({
		id: row.id,
		purpose: row.purpose.toLowerCase(),
		amount_cents: row.amount_cents,
		refunded_cents: row.refunded_cents,
		currency: row.currency,
		status: row.status.toLowerCase(),
		// The schema keeps type, brand, last4 and wallet only (CH-701).
		method: row.method ?? null,
		// CH-702: the mock, or a Stripe payment not taken with a live key (rows before TASK-32.11 have no livemode).
		test: row.provider === 'mock' || row.livemode !== true,
		receipt_sent_at: row.receipt_sent_at?.toISOString() ?? null,
		refunded_at: row.refunded_at?.toISOString() ?? null,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	});
}

export default { toPaymentDto };
