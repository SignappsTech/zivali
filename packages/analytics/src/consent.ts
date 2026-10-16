// Consent record (C12 §Consent storage): strictly necessary, `{ v, analytics, ts }`, re-asked after 12 months.

/** Bump when vendors or purposes change: everyone is asked again. */
export const CONSENT_VERSION = 1;

export type ConsentChoice = { analytics: boolean };
export type ConsentState = { v: number; analytics: boolean; ts: string };
/** Where the record lives. Web default: the `zz_consent` cookie; mobile injects expo-secure-store (key `zz_consent`). */
export type ConsentStorage = { get(): string | null; set(value: string): void };

/** The web cookie; the server reads it too, so the banner's first view is in the HTML (apps/web layout). */
export const CONSENT_KEY = 'zz_consent';
const YEAR_S = 365 * 24 * 60 * 60;
/** The cookie outlives the 12-month window so the age check can say "a year has passed" (TASK-13.7). */
const COOKIE_S = 400 * 24 * 60 * 60;

export const cookieStorage: ConsentStorage = {
	get() {
		if (typeof document === 'undefined') return null;
		const hit = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_KEY}=`));
		return hit ? hit.slice(CONSENT_KEY.length + 1) : null;
	},
	set(value) {
		if (typeof document === 'undefined') return;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; Max-Age=${COOKIE_S}; Path=/; SameSite=Lax${secure}`;
	},
};

/** Accepts plain or URI-encoded JSON; anything malformed counts as "not asked yet". */
export function parseConsent(raw: string | null): ConsentState | null {
	try {
		const s = JSON.parse(decodeURIComponent(raw ?? 'null'));
		return typeof s?.v === 'number' && typeof s.analytics === 'boolean' && typeof s.ts === 'string'
			? { v: s.v, analytics: s.analytics, ts: s.ts }
			: null;
	} catch {
		return null;
	}
}

/** Same version and younger than 12 months. */
export const isCurrent = (s: ConsentState | null): s is ConsentState =>
	!!s && s.v === CONSENT_VERSION && Date.now() - Date.parse(s.ts) < YEAR_S * 1000;
