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
 * Label and unread state of the header's inbox link: the 10 px `primary` dot of the inbox rows and ", unread" in the
 * link's name, never a count (P1). `visible` shows the label (menu row), else it is for screen readers only (icon
 * button). The name is one text node, so browsers add no space before the comma. `live` (once per page) joins the
 * user's Realtime channel (`user:<id>`, ADR-023), so a new notification or a read elsewhere updates it without a
 * reload; supabase-js loads after the page.
 */
export function UnreadDot({
	label,
	visible = false,
	live = false,
	className,
}: {
	label: string;
	visible?: boolean;
	live?: boolean;
	className?: string;
}) {
	const t = useTranslations('notifications');
	const { data } = useListNotificationsQuery(COUNT);
	const store = useStore() as ApiStore;
	const userId = useSession().session?.user.id;
	const unread = Boolean(data?.unread);

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

	const name = unread ? t('row_unread_a11y', { title: label }) : label;
	return (
		<>
			{visible && <span aria-hidden={unread || undefined}>{label}</span>}
			{(!visible || unread) && <span className="sr-only">{name}</span>}
			{unread && <span aria-hidden="true" className={cn('size-2.5 rounded-full bg-primary', className)} />}
		</>
	);
}
