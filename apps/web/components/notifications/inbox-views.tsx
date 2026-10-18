'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { ConversationList } from '@/components/chat/conversations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/client-navigation';

import { NotificationsView } from './notifications-view';
import { useInboxUnread } from './unread-dot';

export type InboxView = 'conversations' | 'notifications';

/** A view's label with the rows' 10 px `primary` dot and ", unread" in the tab's name while it has unread items. */
function ViewLabel({ label, unread }: { label: string; unread: boolean }) {
	const t = useTranslations('chat');
	if (!unread) return label;
	return (
		<>
			<span aria-hidden="true">{label}</span>
			<span className="sr-only">{t('row_unread_a11y', { title: label })}</span>
			<span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-primary" />
		</>
	);
}

/**
 * The inbox's two views (P12, P13): a segmented control over Conversations and Notifications in a 720 px column; each
 * tab carries its unread state, live through the header's Realtime channel (`useInboxUnread`). The view is kept in
 * `?view=` without a navigation, so a reload or a shared link opens the same view. Without a `view` (the URL names
 * none) the inbox opens where the unread items are, Conversations first, decided once both lists answered.
 * `selected` is the open thread beside the list (P12 W1, from lg): the list's heading is then an h2 (the thread has the
 * h1) and Notifications opens the inbox page in that view.
 */
export function InboxViews({ view, selected }: { view?: InboxView; selected?: string }) {
	const t = useTranslations('chat');
	const router = useRouter();
	const unread = useInboxUnread();
	const [chosen, setChosen] = React.useState(view);
	const fallback = unread.notifications && !unread.conversations ? 'notifications' : 'conversations';
	// Fixed once both lists answered, so a later notification never moves the reader to another view.
	if (!chosen && unread.loaded) setChosen(fallback);
	const current = chosen ?? 'conversations';

	const change = (next: string) => {
		if (selected) {
			router.push({ pathname: '/inbox', query: { view: 'notifications' } });
			return;
		}
		setChosen(next as InboxView);
		const url = new URL(window.location.href);
		url.searchParams.set('view', next);
		window.history.replaceState(null, '', url);
	};

	return (
		<Tabs value={current} onValueChange={change} className="mx-auto block max-w-[720px]">
			<TabsList aria-label={t('inbox_title')} className="max-w-[320px]">
				<TabsTrigger value="conversations" className="inline-flex items-center justify-center gap-1.5">
					<ViewLabel label={t('view_conversations')} unread={unread.conversations} />
				</TabsTrigger>
				<TabsTrigger value="notifications" className="inline-flex items-center justify-center gap-1.5">
					<ViewLabel label={t('view_notifications')} unread={unread.notifications} />
				</TabsTrigger>
			</TabsList>
			<TabsContent value="conversations">
				<ConversationList selected={selected} heading={selected ? 'h2' : 'h1'} />
			</TabsContent>
			<TabsContent value="notifications">
				<NotificationsView />
			</TabsContent>
		</Tabs>
	);
}
