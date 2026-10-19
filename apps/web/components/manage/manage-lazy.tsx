'use client';

import * as React from 'react';

// The claim island (ManagePage, Redux and RTK Query, sonner, the captcha hook, the kit): about 66 KB gzip that /m
// fetches after hydration instead of from its HTML, so it no longer competes with the first paint (TASK-17.16).
const load = () => Promise.all([import('@/components/store-provider'), import('./manage-page')]);

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
	const [{ StoreProvider }, { ManagePage }] = island;
	return (
		<StoreProvider>
			<ManagePage />
		</StoreProvider>
	);
}
