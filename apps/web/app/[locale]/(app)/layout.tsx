import { requireViewer } from '@/lib/viewer';

/** C15 group `app` (my pets, my reports, inbox, account, payments return): signed in, checked on the server. */
export default async function AppLayout({ children, params }: LayoutProps<'/[locale]'>) {
	await requireViewer((await params).locale);
	return children;
}
