import type { Locale } from '@zivali/i18n/format';
import { env } from '@/lib/env';

// Client-safe (no catalogues): the canonical link and the poster endpoints, shared by lib/share.ts (server) and the
// lost-report confirmation (browser).

/** The short canonical link of a report (C15): posters and shares use `https://<APP_HOST>/r/<code>`. */
export const reportLink = (code: string) => `${env.NEXT_PUBLIC_APP_URL}/r/${code}`;
/** Web server endpoints (C15), same origin: the A4 poster PDF and the 1080 × 1080 Facebook image. */
export const posterPath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/poster.pdf?lang=${lang}`;
export const squarePath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/square.png?lang=${lang}`;
const slug = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/gi, 'd')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
/** `najdimo-<pet name slug or short code>-<YYYY-MM-DD>-<lang>.pdf`; the language keeps the sl and en files apart (TASK-114.7). */
export const posterFileName = (code: string, lang: Locale, name?: string | null, eventAt?: string | null) =>
	['najdimo', (name && slug(name)) || code, eventAt?.slice(0, 10), lang].filter(Boolean).join('-') + '.pdf';
export const squareFileName = (code: string, lang: Locale) => `najdimo-${code}-${lang}.png`;
