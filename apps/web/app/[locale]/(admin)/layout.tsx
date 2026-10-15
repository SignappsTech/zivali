import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { env } from '@/lib/env';
import { requireViewer } from '@/lib/viewer';

// The console requires sign-in and is never indexed (P19 content slice §9).
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * C15 group `admin`: a verified, non-anonymous session (checked here, on the server), then the P19 shell: staff role
 * and TOTP (aal2) before any page renders, and each page's role from the navigation. The API enforces both (C3).
 */
export default async function AdminLayout({ children, params }: LayoutProps<'/[locale]'>) {
	const viewer = await requireViewer((await params).locale);
	return (
		<AdminShell env={env.APP_ENV} initials={viewer.initials}>
			{children}
		</AdminShell>
	);
}
