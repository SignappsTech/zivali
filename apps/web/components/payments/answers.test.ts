import { afterEach, describe, expect, it, vi } from 'vitest';

import { relinkPayment, rememberPayment, settlePayment } from './answers';

afterEach(() => {
	vi.restoreAllMocks();
	sessionStorage.clear();
});

describe('P15 answers', () => {
	it('relinks a new payment to the ask of the old one, and not a settled one', () => {
		rememberPayment('old', 'tip:A');
		relinkPayment('old', 'new');
		expect(settlePayment('new')).toBe(true);
		expect(sessionStorage.getItem('zz_support:tip:A')).toBe('paid');

		relinkPayment('new', 'newer');
		expect(sessionStorage.getItem('zz_support:payment:newer')).toBeNull();
	});

	it('falls back to memory when only writing fails (read-only storage)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('quota', 'QuotaExceededError');
		});
		rememberPayment('mem', 'tip:B');
		expect(settlePayment('mem')).toBe(true);
		// Same call again: the memory copy is read although getItem works and finds nothing.
		expect(settlePayment('mem')).toBe(false);
	});
});
