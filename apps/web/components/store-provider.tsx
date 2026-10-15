'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { Provider } from 'react-redux';

import type { Locale } from '@zivali/api/client';
import { getStore } from '@/lib/store';

/**
 * Redux and RTK Query for the client components under it (ADR-020 §Client). Not in the root providers: the (app) and
 * (admin) layouts wrap their pages, public pages only the island that calls the API, so the rest of the public site
 * does not load Redux (TASK-90.5). Every provider in a browser tab shares one store per locale (lib/store.ts).
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
	const locale = useLocale() as Locale;
	const store = useMemo(() => getStore(locale), [locale]);
	return <Provider store={store}>{children}</Provider>;
}
