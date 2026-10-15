import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';

import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import { CaptchaHost } from '@/components/auth/captcha-host';

const copy = (lang: unknown) =>
	lang === 'en' ? ({ locale: 'en', t: en.report_found } as const) : ({ locale: 'sl', t: sl.report_found } as const);

export async function generateMetadata({ searchParams }: PageProps<'/captcha'>): Promise<Metadata> {
	return { title: copy((await searchParams).lang).t.captcha_title, robots: { index: false } };
}

/**
 * Turnstile host for the mobile WebView (C7, C15): `/captcha?lang=sl|en`. The app opens it in a sheet when an
 * anonymous sign-in needs a token and reads the posted result (components/auth/captcha-host.tsx).
 */
export default async function CaptchaPage({ searchParams }: PageProps<'/captcha'>) {
	const { locale, t } = copy((await searchParams).lang);
	return (
		<main lang={locale} className="mx-auto box-content max-w-[440px] px-5 py-6">
			<h1 className="font-display text-2xl font-bold tracking-[-0.015em]">{t.captcha_title}</h1>
			<p className="mt-2">{t.captcha_body}</p>
			<NextIntlClientProvider locale={locale} timeZone={timeZone} messages={{}}>
				<CaptchaHost />
			</NextIntlClientProvider>
		</main>
	);
}
