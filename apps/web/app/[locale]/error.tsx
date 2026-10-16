'use client';

import dynamic from 'next/dynamic';

// Error boundaries load with every page, so the 500 page's UI (kit buttons, icons, its intl provider) loads only when
// a page fails.
const ServerErrorPage = dynamic(() => import('@/components/shell/server-error').then((m) => m.ServerErrorPage));

/** P1 500 for a page that failed to render; header and footer stay. "Poskusi znova" renders the page again. */
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return <ServerErrorPage onRetry={reset} />;
}
