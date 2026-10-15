'use client';

import { useTranslations } from 'next-intl';

import { useSession } from '@zivali/api/auth';

import { RecentChanges } from './audit-log';
import { ComingSoon } from './directory/parts';

/**
 * P19 dashboard placeholder: the KPI blocks wait for their counts (M4), so it says "Kmalu"; admins also see the latest
 * audit entries (the audit log is admin only, C3).
 */
export function Dashboard() {
	const t = useTranslations('admin');
	const { role } = useSession();
	return (
		<>
			<ComingSoon title={t('dash_title')} />
			{role === 'ADMIN' && <RecentChanges />}
		</>
	);
}
