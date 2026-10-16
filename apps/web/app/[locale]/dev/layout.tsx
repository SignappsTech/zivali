import { NextIntlClientProvider } from 'next-intl';

import { StoreProvider } from '@/components/store-provider';

/** Dev pages (each guards itself to local): the whole catalogue and the store, which public pages do not get (TASK-90.5). */
export default function DevLayout({ children }: { children: React.ReactNode }) {
	return (
		<NextIntlClientProvider>
			<StoreProvider>{children}</StoreProvider>
		</NextIntlClientProvider>
	);
}
