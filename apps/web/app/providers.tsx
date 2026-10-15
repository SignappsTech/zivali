'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/** Client-side providers. TanStack Query is for client components; server components call the API directly. */
export function Providers({ children }: { children: React.ReactNode }) {
	// One client per browser session (per request on the server), never shared between users.
	// frontend.md: 2 retries, none for 4xx; the 4xx check needs ApiError from @zivali/api.
	const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 2 } } }));

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
