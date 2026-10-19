// payment_receipt email copy per payment purpose (SL and EN): the first paragraph names the purpose it was paid for.
import { describe, expect, it } from 'vitest';

import { renderEmail } from '../../domains/notifications/templates.ts';

const vars = {
	payment_id: '00000000-0000-4000-8000-000000000000',
	amount_cents: 500,
	paid_at: '2026-10-19T10:00:00.000Z',
	receipt_ref: '00000000',
	is_test: 'no',
	has_invoice: 'no',
	has_eor: 'no',
};
const options = { url: 'https://example.test/account/payments', support_email: 'help@example.test' };

// The purpose sentence is the body's first line (p1); the rest of the text carries no purpose wording.
function firstParagraph(purpose: string, locale: 'sl' | 'en') {
	const message = renderEmail(
		'payment_receipt',
		{ ...vars, purpose },
		locale,
		new Date('2026-10-19T10:00:00Z'),
		options
	);
	return message.text;
}

describe('payment_receipt first paragraph per purpose', () => {
	it('support (SL) names a support contribution, not a search publication', () => {
		const line = firstParagraph('support', 'sl');
		expect(line).toContain('za podporo Najdimu');
		expect(line).not.toContain('objavi iskanja');
	});

	it('support (EN) names a support contribution, not a search publication', () => {
		const line = firstParagraph('support', 'en');
		expect(line).toContain('to support Najdimo');
		expect(line).not.toContain('publishing your search');
	});

	it.each([
		['tip', 'sl', 'prispevek v zahvalo'],
		['tip', 'en', 'thank-you contribution'],
		['report_contribution', 'sl', 'ob objavi iskanja'],
		['report_contribution', 'en', 'for publishing your search'],
	])('%s (%s) keeps its copy', (purpose, locale, expected) => {
		expect(firstParagraph(purpose, locale as 'sl' | 'en')).toContain(expected);
	});
});
