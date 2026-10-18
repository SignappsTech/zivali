import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import localFont from 'next/font/local';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { CONSENT_KEY, isCurrent, parseConsent } from '@zivali/analytics';
import { Providers } from '@/app/providers';
import { consentCopy } from '@/components/consent/copy';
import { SiteFooter } from '@/components/shell/footer';
import { SiteHeader } from '@/components/shell/header';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { themeScript } from '@/lib/theme';
import { getViewer } from '@/lib/viewer';

import '../globals.css';

// System §4 v0.14: three static Latin subsets, self-hosted (app/fonts/README.md, 47 KB in all). The variables override
// the font stacks from tokens.css. Preloaded (next/font's default; checked in TASK-11.2: without the preload the fonts
// start after the scripts and the simulated FCP doubles). No 500, 600 or 800 files: the browser's font matching takes
// font-medium to 400 and font-semibold and font-extrabold to 700, and every Bricolage weight to 700.
// next/font takes literal options only, so both calls spell them out.
const display = localFont({
	src: '../fonts/bricolage-grotesque-700.woff2',
	weight: '700',
	variable: '--font-display',
	display: 'swap',
	adjustFontFallback: 'Arial',
	fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});
const sans = localFont({
	src: [
		{ path: '../fonts/atkinson-hyperlegible-next-400.woff2', weight: '400' },
		{ path: '../fonts/atkinson-hyperlegible-next-700.woff2', weight: '700' },
	],
	variable: '--font-sans',
	display: 'swap',
	adjustFontFallback: 'Arial',
	fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

/** Defaults for every page (P1 content slice §7); pages set their own title, description and canonical (absoluteUrl). */
export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({
		locale: hasLocale(routing.locales, locale) ? locale : 'sl',
		namespace: 'common',
	});
	return {
		// Relative metadata URLs resolve on the validated app URL, never on the request Host.
		metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
		title: { default: t('seo_title'), template: '%s · Najdimo' },
		description: t('seo_description'),
	};
}

/** The P1 shell around every page: header with the skip link, the page (it renders `main#main`), footer. */
export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();
	const nonce = (await headers()).get('x-nonce') ?? undefined;
	const viewer = await getViewer();
	// P17 banner: decided here from the cookie, so its first view paints with the page instead of becoming a late LCP.
	const stored = parseConsent((await cookies()).get(CONSENT_KEY)?.value ?? null);
	const prompt = !isCurrent(stored);
	const [messages, t] = await Promise.all([getMessages(), getTranslations('consent')]);
	// No intl provider around the page (TASK-90.7): the shell's client islands get their strings as props, so a public
	// page ships no intl runtime. Client components that translate sit under PageMessages or an (app), (admin) or dev
	// layout provider; only the lazily loaded 500 page reads these.
	const errorMessages = { common: messages.common, errors: messages.errors };

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className={`${display.variable} ${sans.variable} flex min-h-dvh flex-col`}>
				<Providers
					signedIn={viewer !== null}
					consent={{
						prompt,
						copy: consentCopy(t, prompt, stored),
						policyHref: getPathname({ locale, href: '/cookies' }),
					}}
					messages={errorMessages}
				>
					<SiteHeader viewer={viewer} />
					<div className="flex-1">{children}</div>
					<SiteFooter />
				</Providers>
			</body>
		</html>
	);
}
