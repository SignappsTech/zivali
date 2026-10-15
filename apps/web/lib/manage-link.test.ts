import { afterEach, describe, expect, it, vi } from 'vitest';

import { fragmentToken, manageLink, saveManageToken } from './manage-link';

afterEach(() => {
	localStorage.clear();
	window.location.hash = '';
});

describe('manage link (C7)', () => {
	it('keeps the submit token for its report on this device', () => {
		expect(saveManageToken('7c1e4b2a', 'q7Vt-token')).toBe(true);
		expect(localStorage.getItem('manage:7c1e4b2a')).toBe('q7Vt-token');

		vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
			throw new DOMException('full', 'QuotaExceededError');
		});
		expect(saveManageToken('other', 'token')).toBe(false);
	});

	it('puts the token in the fragment of /m (SL) and /en/m', () => {
		const origin = window.location.origin;
		expect(manageLink('q7Vt-token', 'sl')).toBe(`${origin}/m#q7Vt-token`);
		expect(manageLink('q7Vt-token', 'en')).toBe(`${origin}/en/m#q7Vt-token`);
	});

	it('reads the token from the fragment', () => {
		expect(fragmentToken()).toBeNull();
		window.location.hash = '#q7Vt-token';
		expect(fragmentToken()).toBe('q7Vt-token');
	});
});
