'use client';

import dynamic from 'next/dynamic';

import type { ConsentState } from '@zivali/analytics';
import { isAdminPath, ScreenViews } from '@/components/analytics/screen-views';
import { ConsentBanner } from '@/components/consent/consent-banner';
import { usePathname } from '@/i18n/navigation';

// Signed-in pages only, after hydration: it brings the Redux store, which public pages do not load (TASK-90.5).
const SessionSync = dynamic(() => import('@/components/auth/session-sync').then((m) => m.SessionSyncIsland), {
	ssr: false,
});

/**
 * Client-side providers. No Redux store here: client components that call the API sit under a StoreProvider
 * (components/store-provider.tsx: the (app) and (admin) layouts, or the island on a public page); server components
 * call the API. `signedIn` (the layout's viewer) connects the Supabase session on signed-in pages only, so signed-out
 * pages do not load supabase-js. `consent` is the layout's reading of the consent cookie: the banner's first view is
 * server-rendered and paints with the page (client-only, it was the LCP element, seconds late: TASK-90.4).
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
	// A choice made in the console would start GA there (C12), so the banner waits for the public pages.
	const admin = isAdminPath(usePathname());

	return (
		<>
			<ScreenViews />
			{signedIn && <SessionSync />}
			{children}
			{!admin && <ConsentBanner {...consent} />}
		</>
	);
}
