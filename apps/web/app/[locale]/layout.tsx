import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { Providers } from '@/app/providers';
import { routing } from '@/i18n/routing';

import '../globals.css';

// The variables override the font stacks from tokens.css (system §4).
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

export const metadata: Metadata = { title: 'Najdimo' };

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();
	const nonce = (await headers()).get('x-nonce') ?? undefined;

	return (
		<html lang={locale} suppressHydrationWarning>
			<head>
				<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className={`${display.variable} ${sans.variable}`}>
				<NextIntlClientProvider>
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
