import { requireViewer } from '@/lib/viewer';

/** C15 group `portal` (M3): signed in, checked on the server. TODO(M3): organisation membership and the P19 shell. */
export default async function PortalLayout({ children, params }: LayoutProps<'/[locale]'>) {
	await requireViewer((await params).locale);
	return children;
}
