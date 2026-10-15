'use client';

import { useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import type { Locale } from '@zivali/api/client';
import { ScreenViews } from '@/components/analytics/screen-views';
import { makeStore } from '@/lib/store';

// Client-only and after the first paint: the banner never sits on the LCP path (P17).
const ConsentBanner = dynamic(() => import('@/components/consent/consent-banner').then((m) => m.ConsentBanner), {
	ssr: false,
});

/** Client-side providers. RTK Query hooks (@zivali/api) are for client components; server components call the API. */
export function Providers({ children }: { children: React.ReactNode }) {
	const locale = useLocale() as Locale;
	// One store per browser session (per request on the server), never shared between users; a new one per locale,
	// since responses are localised (Accept-Language).
	const store = useMemo(() => makeStore(locale), [locale]);

	return (
		<Provider store={store}>
			<ScreenViews />
			{children}
			<ConsentBanner />
		</Provider>
	);
}
