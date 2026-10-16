// Mock fiscal provider (C13): deterministic ZOI and EOR from the invoice data, no network. The HMAC key is not a
// secret: mock codes only look like FURS codes and are never valid there; receipts of mock invoices say "test".
import { createHash, createHmac } from 'node:crypto';

import { zoiInput, type FiscalAdapter } from './index.ts';

const MOCK_SIGNING_KEY = 'najdimo-mock-fiscal';

/** An EOR-shaped id (FURS returns a UUID) from a hash. */
const asUuid = (hex: string) =>
	`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

export function mockFiscal(seller: { tax_number: string; premise_id: string; device_id: string }): FiscalAdapter {
	const zoi: FiscalAdapter['zoi'] = (invoice) => {
		const signature = createHmac('sha256', MOCK_SIGNING_KEY).update(zoiInput(seller.tax_number, invoice)).digest();
		return createHash('md5').update(signature).digest('hex');
	};
	return {
		provider: 'mock',
		live: false,
		...seller,
		zoi,
		async issue(invoice) {
			const code = invoice.zoi;
			return {
				zoi: code,
				eor: asUuid(createHash('sha256').update(`eor:${code}`).digest('hex')),
				issued_at: invoice.issued_at,
			};
		},
	};
}
