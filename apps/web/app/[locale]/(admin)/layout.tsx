import { requireViewer } from '@/lib/viewer';

/**
 * C15 group `admin`: signed in, checked on the server. Role and aal2 are checked by AdminGate in the page and enforced
 * by the API (C3). TODO(TASK-34.3): the admin shell, TOTP challenge and role navigation move here.
 */
export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]'>) {
	await requireViewer((await params).locale);
	return children;
}
