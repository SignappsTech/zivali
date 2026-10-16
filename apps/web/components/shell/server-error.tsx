'use client';

import { type Locale, NextIntlClientProvider, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { use } from 'react';

import { timeZone } from '@zivali/i18n/format';
import { ShellMessages } from '@/app/providers';

import { ContentPage, ErrorPage } from './page';

function Page500({ onRetry }: { onRetry: () => void }) {
	const t = useTranslations('errors');

	return (
		<ContentPage>
			<title>{`${t('page_500_doc_title')} · Najdimo`}</title>
			<ErrorPage status={500} onRetry={onRetry} />
		</ContentPage>
	);
}

/**
 * The 500 page for app/[locale]/error.tsx, which loads it only when a page fails. The root layout has no intl
 * provider (TASK-90.7), so it brings its own with the messages the layout hands to Providers.
 */
export function ServerErrorPage({ onRetry }: { onRetry: () => void }) {
	return (
		<NextIntlClientProvider
			locale={useParams<{ locale: Locale }>().locale}
			timeZone={timeZone}
			messages={use(ShellMessages)}
		>
			<Page500 onRetry={onRetry} />
		</NextIntlClientProvider>
	);
}
