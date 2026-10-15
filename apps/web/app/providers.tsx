'use client';

import { useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import type { Locale } from '@zivali/api/client';
import { isAdminPath, ScreenViews } from '@/components/analytics/screen-views';
import { SessionSync } from '@/components/auth/session-sync';
import { usePathname } from '@/i18n/navigation';
import { makeStore } from '@/lib/store';

// Client-only and after the first paint: the banner never sits on the LCP path (P17).
const ConsentBanner = dynamic(() => import('@/components/consent/consent-banner').then((m) => m.ConsentBanner), {
	ssr: false,
});

/**
 * Client-side providers. RTK Query hooks (@zivali/api) are for client components; server components call the API.
 * `signedIn` (the layout's viewer) connects the Supabase session on signed-in pages only, so signed-out pages do not
 * load supabase-js.
 */
export function Providers({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
	const locale = useLocale() as Locale;
	// One store per browser session (per request on the server), never shared between users; a new one per locale,
	// since responses are localised (Accept-Language).
	const store = useMemo(() => makeStore(locale), [locale]);
	// A choice made in the console would start GA there (C12), so the banner waits for the public pages.
	const admin = isAdminPath(usePathname());

	return (
		<Provider store={store}>
			<ScreenViews />
			{signedIn && <SessionSync />}
			{children}
			{!admin && <ConsentBanner />}
		</Provider>
	);
}
