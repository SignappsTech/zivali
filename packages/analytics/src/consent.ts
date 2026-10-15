// Consent record (C12 §Consent storage): strictly necessary, `{ v, analytics, ts }`, re-asked after 12 months.

/** Bump when vendors or purposes change: everyone is asked again. */
export const CONSENT_VERSION = 1;

export type ConsentChoice = { analytics: boolean };
export type ConsentState = { v: number; analytics: boolean; ts: string };
/** Where the record lives. Web default: the `zz_consent` cookie; mobile injects expo-secure-store (key `zz_consent`). */
export type ConsentStorage = { get(): string | null; set(value: string): void };

const KEY = 'zz_consent';
const YEAR_S = 365 * 24 * 60 * 60;

export const cookieStorage: ConsentStorage = {
	get() {
		if (typeof document === 'undefined') return null;
		const hit = document.cookie.split('; ').find((c) => c.startsWith(`${KEY}=`));
		return hit ? hit.slice(KEY.length + 1) : null;
	},
	set(value) {
		if (typeof document === 'undefined') return;
		const secure = location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = `${KEY}=${encodeURIComponent(value)}; Max-Age=${YEAR_S}; Path=/; SameSite=Lax${secure}`;
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
