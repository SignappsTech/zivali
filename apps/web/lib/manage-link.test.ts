import { afterEach, describe, expect, it, vi } from 'vitest';

import { manageLink, saveManageToken, takeManageToken } from './manage-link';

afterEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	history.replaceState(null, '', '/');
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

	it('takes the token out of the address bar and keeps it for a reload in this tab', () => {
		history.replaceState(null, '', '/m');
		expect(takeManageToken()).toBeNull();
		history.replaceState(null, '', '/en/m?x=1#q7Vt-token');
		expect(takeManageToken()).toBe('q7Vt-token');
		expect(window.location.href).toBe(`${window.location.origin}/en/m?x=1`);
		expect(takeManageToken()).toBe('q7Vt-token');
		// Another link opened in the tab wins.
		history.replaceState(null, '', '/m#other');
		expect(takeManageToken()).toBe('other');
		expect(sessionStorage.getItem('manage_token')).toBe('other');
	});
});
