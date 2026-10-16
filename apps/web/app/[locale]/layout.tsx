import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { CONSENT_KEY, isCurrent, parseConsent } from '@zivali/analytics';
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

// The namespaces that client components on public pages read; only these go into every page's HTML, the rest of the
// catalogue (emails, notifications, page copy, admin, ...) stays on the server (TASK-90.5). The (app), (admin) and dev
// layouts and the header's inbox dot pass their own. A new client namespace on a public page goes here.
const CLIENT_NAMESPACES = [
	'auth',
	'common',
	'consent',
	'errors',
	'lifecycle',
	'nav',
	'report_found',
	'shelters',
] as const;

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
	// P17 banner: decided here from the cookie, so its first view paints with the page instead of becoming a late LCP.
	const consent = parseConsent((await cookies()).get(CONSENT_KEY)?.value ?? null);
	const messages = await getMessages();
	const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, messages[ns]]));

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className={`${display.variable} ${sans.variable}`}>
				<NextIntlClientProvider messages={clientMessages}>
					<Providers signedIn={viewer !== null} consent={{ prompt: !isCurrent(consent), stored: consent }}>
						<SiteHeader viewer={viewer} />
						{children}
						<SiteFooter />
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
