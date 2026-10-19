'use client';

import * as React from 'react';

// The claim page (ManagePage, the captcha hook, the kit) that /m fetches after hydration instead of from its HTML, so
// it does not compete with the first paint (TASK-17.16). Redux, RTK Query and the toaster come later, with the claim
// (manage-view.tsx, TASK-17.17).
const load = () => import('./manage-page');

/**
 * /m: `children` (the server's skeleton, in ManagePage's first-render shape) until the island has loaded. A failed
 * download goes to the page's error boundary, whose "Poskusi znova" mounts this again and so loads again.
 */
export function ManageLazy({ children }: { children: React.ReactNode }) {
	const [island, setIsland] = React.useState<Awaited<ReturnType<typeof load>>>();
	const [error, setError] = React.useState<unknown>();
	React.useEffect(() => {
		load().then(setIsland, setError);
	}, []);

	if (error) throw error;
	if (!island) return children;
	const { ManagePage } = island;
	return <ManagePage />;
}
