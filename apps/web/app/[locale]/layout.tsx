import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { Providers } from '@/app/providers';
import { SiteFooter } from '@/components/shell/footer';
import { SiteHeader } from '@/components/shell/header';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { getViewer } from '@/lib/viewer';

import '../globals.css';

// The variables override the font stacks from tokens.css (system §4). Preloaded (checked in TASK-11.2: without the
// preload the fonts start after the scripts and the simulated FCP doubles, LCP stays the same).
const display = Bricolage_Grotesque({
	subsets: ['latin', 'latin-ext'],
	axes: ['opsz'],
	variable: '--font-display',
	display: 'swap',
});
// next/font has no metrics for this family yet, so the build warns that it cannot size a fallback font.
const sans = Atkinson_Hyperlegible_Next({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });

// Light and dark follow the OS before the first paint (system §12; the manual override comes with the profile).
const themeScript = `(()=>{const m=matchMedia('(prefers-color-scheme: dark)');const s=()=>document.documentElement.classList.toggle('dark',m.matches);s();m.addEventListener('change',s)})()`;

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

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className={`${display.variable} ${sans.variable}`}>
				<NextIntlClientProvider>
					<Providers>
						<SiteHeader viewer={viewer} />
						{children}
						<SiteFooter />
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
