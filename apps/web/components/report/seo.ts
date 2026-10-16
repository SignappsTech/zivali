// P9 SEO text rules (content slice §10), pure so the page and the tests share them.
import type { Locale } from 'next-intl';

const TITLE_MAX = 60;
const NAME_MAX = 16;
const DESCRIPTION_MAX = 155;
const SUFFIX = ' · Najdimo';

/** Stands in for a value the report does not have: its ", {colours}" or " {name}" part goes. */
export const NONE = '\u0000';
/** Stands in for an unknown area (outside Slovenia, failed lookup): the sentence that names it goes. */
export const NO_AREA = '\u0001';

/**
 * Meta title "Izgubljen pes Rex – Ljubljana · Najdimo" from the P4 row title (`kind`): the name cut to 16
 * characters; over 60 the name goes, then the suffix. `og` is the full title without the suffix.
 */
export function metaTitle(kind: string, name?: string, municipality?: string) {
	const named = name ? ` ${name.slice(0, NAME_MAX).trimEnd()}` : '';
	const where = municipality ? ` – ${municipality}` : '';
	const titles = [`${kind}${named}${where}${SUFFIX}`, `${kind}${where}${SUFFIX}`, `${kind}${where}`];
	return { title: titles.find((title) => title.length <= TITLE_MAX) ?? titles[2]!, og: `${kind}${named}${where}` };
}

/**
 * Meta description from the rendered `report.seo_description_<type>`: its sentences in order, stopping before the one
 * that would pass 155 characters. Sentences end at . ? ! after a non-digit, so "12. oktobra" stays whole.
 */
export function metaDescription(text: string) {
	let description = '';
	for (const sentence of text.split(/(?<=\D[.?!])\s+/)) {
		if (sentence.includes(NO_AREA)) continue;
		const next = `${description} ${sentence.replaceAll(`, ${NONE}`, '').replaceAll(` ${NONE}`, '')}`.trim();
		if (next.length > DESCRIPTION_MAX) break;
		description = next;
	}
	return description;
}

/** "rjave in bele" / "black, brown and white" (glossary §7.2 joins). */
export const listOf = (words: string[], locale: Locale) =>
	new Intl.ListFormat(locale === 'sl' ? 'sl' : 'en-GB', { type: 'conjunction' }).format(words);
