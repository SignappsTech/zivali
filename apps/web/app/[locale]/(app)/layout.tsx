import { NextIntlClientProvider } from 'next-intl';

import { StoreProvider } from '@/components/store-provider';
import { requireViewer } from '@/lib/viewer';

/** C15 group `app` (my pets, my reports, inbox, account, payments return): a verified session, anonymous report managers included (C15, /m); pages that need an account opt out. */
export default async function AppLayout({ children, params }: LayoutProps<'/[locale]'>) {
	await requireViewer((await params).locale, { allowAnonymous: true });
	// The whole catalogue (the root layout sends only the public pages' namespaces) and the store (TASK-90.5).
	return (
		<NextIntlClientProvider>
			<StoreProvider>{children}</StoreProvider>
		</NextIntlClientProvider>
	);
}
