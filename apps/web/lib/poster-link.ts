import type { Locale } from '@zivali/i18n/format';
import { env } from '@/lib/env';

// Client-safe (no catalogues): the canonical link and the poster endpoints, shared by lib/share.ts (server) and the
// lost-report confirmation (browser).

/** The short canonical link of a report (C15): posters and shares use `https://<APP_HOST>/r/<code>`. */
export const reportLink = (code: string) => `${env.NEXT_PUBLIC_APP_URL}/r/${code}`;
/** Web server endpoints (C15), same origin: the A4 poster PDF and the 1080 × 1080 Facebook image. */
export const posterPath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/poster.pdf?lang=${lang}`;
export const squarePath = (code: string, lang: Locale) => `/r/${encodeURIComponent(code)}/square.png?lang=${lang}`;
/** No pet name in the file name, so the file is safe to forward (content P18 §1). */
/** The language is in the name, so the Slovenian and the English file do not overwrite each other. */
export const posterFileName = (code: string, lang: Locale) => `najdimo-${code}-${lang}.pdf`;
export const squareFileName = (code: string, lang: Locale) => `najdimo-${code}-${lang}.png`;
