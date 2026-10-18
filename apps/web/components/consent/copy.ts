import type { useTranslations } from 'next-intl';

import { CONSENT_VERSION, type ConsentState } from '@zivali/analytics';

const KEYS = [
	'title',
	'body_web',
	'policy_link',
	'reject_all',
	'accept_all',
	'customise',
	'dialog_label',
	'back',
	'settings_title',
	'necessary_title',
	'necessary_body',
	'necessary_locked',
	'analytics_title',
	'analytics_body_web',
	'analytics_switch_a11y',
	'save',
	'saved_toast',
	'ads_note',
] as const;

/** The P17 banner's strings; `reask` says why it asks again (null on a first visit). */
export type ConsentCopy = Record<(typeof KEYS)[number], string> & { reask: string | null };

/**
 * The banner's copy, made on the server (app/[locale]/layout.tsx), so the banner ships no translator (TASK-90.7).
 * `prompt` and `stored` are the layout's reading of the consent cookie. A version bump names its change only when the
 * catalogues document one (`change_<v>`); otherwise the choice expired by age.
 */
export function consentCopy(
	t: ReturnType<typeof useTranslations<'consent'>>,
	prompt: boolean,
	stored: ConsentState | null
): ConsentCopy {
	const copy = Object.fromEntries(
		KEYS.map((key) => [key, key === 'necessary_body' ? t.raw(key) : t(key)])
	) as ConsentCopy;
	copy.reask = null;
	if (prompt && stored) {
		const change = `change_${CONSENT_VERSION}` as never; // a short phrase added to both catalogues with each bump
		if (stored.v === CONSENT_VERSION) copy.reask = t('reask_year');
		else if (t.has(change)) copy.reask = t('reask_changed', { change: t(change) });
	}
	return copy;
}
