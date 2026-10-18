'use client';

import { type AbstractIntlMessages, type Locale, NextIntlClientProvider, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { useStore } from 'react-redux';

import { useSession } from '@zivali/api/auth';
import { useListConversationsQuery } from '@zivali/api/chat';
import { subscribeInbox, useListNotificationsQuery } from '@zivali/api/notifications';
import type { ApiStore } from '@zivali/api/rtk';
import { timeZone } from '@zivali/i18n/format';
import { StoreProvider } from '@/components/store-provider';
import { cn } from '@/lib/utils';

/** The badge needs only the unread count (C10 `unread`), not the rows. */
const COUNT = { limit: 1 };

/**
 * Where the inbox has unread items: any conversation with unread messages (the list's first page, newest activity
 * first, C9; the same request as the Conversations view) and any unread notification (C10 `unread`). `loaded` once both
 * answered, `failed` once either gave up. `subscribeInbox` re-fetches both, so this follows Realtime.
 */
export function useInboxUnread() {
	const conversations = useListConversationsQuery();
	const notifications = useListNotificationsQuery(COUNT);
	return {
		conversations: Boolean(conversations.data?.items.some((conversation) => conversation.unread > 0)),
		notifications: Boolean(notifications.data?.unread),
		loaded: Boolean(conversations.data && notifications.data),
		failed: conversations.isError || notifications.isError,
	};
}

/**
 * Label and unread state of the header's inbox link: the 10 px `primary` dot of the inbox rows and ", unread" in the
 * link's name while a conversation or a notification is unread, never a count (P1). `visible` shows the label (menu
 * row), else it is for screen readers only (icon button). The name is one text node, so browsers add no space before
 * the comma. `live` (once per page) joins the user's Realtime channel (`user:<id>`, ADR-023), so a new notification or
 * a read elsewhere updates it without a reload; supabase-js loads after the page.
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
	const inbox = useInboxUnread();
	const store = useStore() as ApiStore;
	const userId = useSession().session?.user.id;
	const unread = inbox.conversations || inbox.notifications;

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

/**
 * UnreadDot with the shared store, for the header, which loads it on signed-in pages only (TASK-90.5). The root
 * layout has no intl provider (TASK-90.7), so the island brings one with the `messages` the header passes.
 */
export function UnreadDotIsland({
	messages,
	...props
}: React.ComponentProps<typeof UnreadDot> & { messages: AbstractIntlMessages }) {
	return (
		<NextIntlClientProvider locale={useParams<{ locale: Locale }>().locale} timeZone={timeZone} messages={messages}>
			<StoreProvider>
				<UnreadDot {...props} />
			</StoreProvider>
		</NextIntlClientProvider>
	);
}
