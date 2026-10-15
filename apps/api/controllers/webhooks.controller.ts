// Thin: the raw body and signature header → domain → 200 { received: true } (Stripe retries anything else).
import type { Request, Response } from 'express';

import { PaymentsDomain } from '../domains/payments/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function stripe(req: Request, res: Response): Promise<void> {
	const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
	await PaymentsDomain.handleWebhook({ rawBody, signature: req.get('stripe-signature') }, userCtx(req));
	res.json({ received: true });
}

export default { stripe };
