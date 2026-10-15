'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useStore } from 'react-redux';

import { configureAuth, type RequireAuth, useRequireAuth } from '@zivali/api/auth';
import type { ApiStore } from '@zivali/api/rtk';
import { Button } from '@/components/ui/button';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * The gate only hides UI: the API enforces role ADMIN and aal2 on every admin call (TASK-6.12).
 *
 * TODO(TASK-34.3): the admin shell owns this guard (route group layout, TOTP challenge and enrolment, role
 * navigation). Until it lands this is the minimum the directory page needs, never a bypass: children render only for
 * the required role with an aal2 session; everyone else gets sign-in, the access-denied screen or the aal2 notice.
 */
export function AdminGate({ require, children }: { require: RequireAuth; children: React.ReactNode }) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const tErrors = useTranslations('errors');
	const store = useStore() as ApiStore;
	const router = useRouter();
	const pathname = usePathname();
	// TODO(TASK-34.3): configureAuth runs once for the app (providers or the shell layout), not per page.
	React.useEffect(() => configureAuth(createClient(), store), [store]);
	const { gate } = useRequireAuth(require);

	React.useEffect(() => {
		if (gate === 'signin') router.replace({ pathname: '/sign-in', query: { next: pathname } });
	}, [gate, pathname, router]);

	if (gate === 'ok') return children;
	if (gate === 'loading' || gate === 'signin')
		return (
			<p role="status" className="sr-only">
				{tCommon('loading')}
			</p>
		);
	// P19 access denied: h1, one sentence, a text button back to the app; no hint of what exists.
	return (
		<div className="max-w-[62ch] py-10">
			<h1 className="font-display text-3xl leading-9 font-bold tracking-[-0.02em] text-balance">
				{t('denied_title')}
			</h1>
			<p className="mt-3">
				{gate === 'aal2' ? tErrors('AAL2_REQUIRED') : gate === 'error' ? t('error') : t('denied_body')}
			</p>
			<Button asChild variant="text" className="mt-4 -ml-3">
				<Link href="/">{t('denied_back')}</Link>
			</Button>
		</div>
	);
}
