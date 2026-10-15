'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useStore } from 'react-redux';

import { useSession } from '@zivali/api/auth';
import { subscribeInbox, useListNotificationsQuery } from '@zivali/api/notifications';
import type { ApiStore } from '@zivali/api/rtk';
import { cn } from '@/lib/utils';

/** The badge needs only the unread count (C10 `unread`), not the rows. */
const COUNT = { limit: 1 };

/**
 * Unread state of the header's inbox link: the 10 px `primary` dot of the inbox rows and "unread" in the link's name,
 * never a count (P1). `live` (once per page) joins the user's Realtime channel (`user:<id>`, ADR-023), so a new
 * notification or a read elsewhere updates it without a reload; supabase-js loads after the page.
 */
export function UnreadDot({ live = false, className }: { live?: boolean; className?: string }) {
	const t = useTranslations('common');
	const { data } = useListNotificationsQuery(COUNT);
	const store = useStore() as ApiStore;
	const userId = useSession().session?.user.id;

	React.useEffect(() => {
		if (!live || !userId) return;
		let stop: (() => void) | undefined;
		let cancelled = false;
		void import('@/lib/supabase/client').then(({ createClient }) => {
			if (!cancelled) stop = subscribeInbox(createClient(), store.dispatch, userId);
		});
		return () => {
			cancelled = true;
			stop?.();
		};
	}, [live, store, userId]);

	if (!data?.unread) return null;
	return (
		<>
			<span aria-hidden="true" className={cn('size-2.5 rounded-full bg-primary', className)} />
			<span className="sr-only">, {t('unread')}</span>
		</>
	);
}
