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
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	});
}

export default { toPaymentDto };
