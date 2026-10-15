'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import type { ConsentState } from '@zivali/analytics';
import type { Locale } from '@zivali/api/client';
import { isAdminPath, ScreenViews } from '@/components/analytics/screen-views';
import { SessionSync } from '@/components/auth/session-sync';
import { ConsentBanner } from '@/components/consent/consent-banner';
import { usePathname } from '@/i18n/navigation';
import { makeStore } from '@/lib/store';

/**
 * Client-side providers. RTK Query hooks (@zivali/api) are for client components; server components call the API.
 * `signedIn` (the layout's viewer) connects the Supabase session on signed-in pages only, so signed-out pages do not
 * load supabase-js. `consent` is the layout's reading of the consent cookie: the banner's first view is server-rendered
 * and paints with the page (client-only, it was the LCP element, seconds late: TASK-90.4).
 */
export function Providers({
	children,
	signedIn = false,
	consent,
}: {
	children: React.ReactNode;
	signedIn?: boolean;
	consent?: { prompt: boolean; stored: ConsentState | null };
}) {
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
			{!admin && <ConsentBanner {...consent} />}
		</Provider>
	);
}
