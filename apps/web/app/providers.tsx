'use client';

import type { AbstractIntlMessages } from 'next-intl';
import dynamic from 'next/dynamic';
import { createContext } from 'react';

import { isAdminPath, ScreenViews } from '@/components/analytics/screen-views';
import { ConsentBanner } from '@/components/consent/consent-banner';
import { useRoute } from '@/i18n/client-navigation';

// Signed-in pages only, after hydration: it brings the Redux store, which public pages do not load (TASK-90.5).
const SessionSync = dynamic(() => import('@/components/auth/session-sync').then((m) => m.SessionSyncIsland), {
	ssr: false,
});

/** The messages the lazily loaded 500 page translates with (components/shell/server-error.tsx). */
export const ShellMessages = createContext<AbstractIntlMessages>({});

/**
 * Client-side providers. No Redux store here: client components that call the API sit under a StoreProvider
 * (components/store-provider.tsx: the (app) and (admin) layouts, or the island on a public page); server components
 * call the API. No intl provider either (TASK-90.7): the shell's islands get their strings as props, and client
 * components that translate sit under one (PageMessages, or the (app), (admin) and dev layouts). `signedIn` (the
 * layout's viewer) connects the Supabase session on signed-in pages only, so signed-out pages do not load supabase-js.
 * `consent` is the layout's reading of the consent cookie with the banner's copy: the banner's first view is
 * server-rendered and paints with the page (client-only, it was the LCP element, seconds late: TASK-90.4). It comes
 * first in the body (fixed, so nothing moves): at the end of the HTML, after the header, page and footer (56 of 138 KB
 * on /kako-deluje), it could paint frames after the page's top, once the scripts had run, and as the largest text it
 * set a late LCP (TASK-112.1). First in the HTML, it paints in the first frame.
 */
export function Providers({
	children,
	signedIn = false,
	consent,
	messages,
}: {
	children: React.ReactNode;
	signedIn?: boolean;
	consent: React.ComponentProps<typeof ConsentBanner>;
	messages: AbstractIntlMessages;
}) {
	// A choice made in the console would start GA there (C12), so the banner waits for the public pages.
	const admin = isAdminPath(useRoute().pathname);

	return (
		<ShellMessages value={messages}>
			{!admin && <ConsentBanner {...consent} />}
			<ScreenViews />
			{signedIn && <SessionSync />}
			{children}
		</ShellMessages>
	);
}
