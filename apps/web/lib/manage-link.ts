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

/** The token from the current URL's fragment (`/m#<token>`), or null. */
export const fragmentToken = (): string | null => window.location.hash.slice(1).trim() || null;
