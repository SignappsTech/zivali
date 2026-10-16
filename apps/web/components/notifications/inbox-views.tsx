'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { ConversationList } from '@/components/chat/conversations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/client-navigation';

import { NotificationsView } from './notifications-view';

export type InboxView = 'conversations' | 'notifications';

/**
 * The inbox's two views (P12, P13): a segmented control over Conversations and Notifications in a 720 px column. The
 * view is kept in `?view=notifications` without a navigation, so a reload or a shared link opens the same view.
 * `selected` is the open thread beside the list (P12 W1, from lg): the list's heading is then an h2 (the thread has the
 * h1) and Notifications opens the inbox page in that view.
 */
export function InboxViews({ view, selected }: { view: InboxView; selected?: string }) {
	const t = useTranslations('chat');
	const router = useRouter();
	const [current, setCurrent] = React.useState(view);

	const change = (next: string) => {
		if (selected) {
			router.push({ pathname: '/inbox', query: { view: 'notifications' } });
			return;
		}
		setCurrent(next as InboxView);
		const url = new URL(window.location.href);
		if (next === 'notifications') url.searchParams.set('view', next);
		else url.searchParams.delete('view');
		window.history.replaceState(null, '', url);
	};

	return (
		<Tabs value={current} onValueChange={change} className="mx-auto block max-w-[720px]">
			<TabsList aria-label={t('inbox_title')} className="max-w-[320px]">
				<TabsTrigger value="conversations">{t('view_conversations')}</TabsTrigger>
				<TabsTrigger value="notifications">{t('view_notifications')}</TabsTrigger>
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
