import type { Locale } from 'next-intl';

import { getPathname } from '@/i18n/navigation';

// C7 private manage link: `<APP_URL>/m#<token>` (SL) or `/en/m#<token>`. The token sits in the fragment, so it never
// reaches a server log or a Referer header; it is shown once at submit and kept on this device.

/** Keeps the token the submit returned (POST /v1/reports `manage_token`) for that report; false if storage is blocked. */
export function saveManageToken(reportId: string, token: string): boolean {
	try {
		localStorage.setItem(`manage:${reportId}`, token);
		return true;
	} catch {
		return false;
	}
}

/** The link for the success screen, on this site's origin. */
export const manageLink = (token: string, locale: Locale) =>
	`${window.location.origin}${getPathname({ locale, href: '/m' })}#${token}`;

const STASH = 'manage_token';

/**
 * The token of `/m#<token>`, or null. It leaves the address bar and the (synced) history at once and waits in this
 * tab's sessionStorage, so a reload or a retry still finds it; a new fragment (another link) replaces it.
 */
export function takeManageToken(): string | null {
	const token = window.location.hash.slice(1).trim();
	if (!token) {
		try {
			return sessionStorage.getItem(STASH);
		} catch {
			return null;
		}
	}
	try {
		sessionStorage.setItem(STASH, token);
	} catch {
		// Blocked storage: the claim still runs now; a reload needs the link again.
	}
	history.replaceState(null, '', window.location.pathname + window.location.search);
	return token;
}
