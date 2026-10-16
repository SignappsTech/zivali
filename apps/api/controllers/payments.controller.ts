// Thin: request → ctx → domain → mapper → response. No try/catch (Express 5 forwards rejections).
import type { Request, Response } from 'express';

import { CheckoutResponse } from '@zivali/validation';

import { PaymentsDomain, PaymentsMapper } from '../domains/payments/index.ts';
import { userCtx } from '../lib/ctx.ts';

export async function checkout(req: Request, res: Response): Promise<void> {
	res.json(CheckoutResponse.parse(await PaymentsDomain.createCheckout(req.body, userCtx(req))));
}

export async function get(req: Request, res: Response): Promise<void> {
	const row = await PaymentsDomain.getPayment({ id: req.params.id as string }, userCtx(req));
	res.json(PaymentsMapper.toPaymentDto(row));
}

export async function invoicePdf(req: Request, res: Response): Promise<void> {
	const { number, pdf } = await PaymentsDomain.getInvoicePdf({ id: req.params.id as string }, userCtx(req));
	res.type('application/pdf')
		.set('Content-Disposition', `attachment; filename="racun-${number}.pdf"`)
		.set('Cache-Control', 'private, no-store')
		.send(pdf);
}

export async function listMine(req: Request, res: Response): Promise<void> {
	const page = await PaymentsDomain.listMyPayments(req.query, userCtx(req));
	res.json({ items: page.items.map(PaymentsMapper.toPaymentDto), next_cursor: page.next_cursor });
}

export default { checkout, get, invoicePdf, listMine };
