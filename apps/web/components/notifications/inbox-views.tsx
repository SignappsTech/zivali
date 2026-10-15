'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Placeholder } from '@/components/shell/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { NotificationsView } from './notifications-view';

export type InboxView = 'conversations' | 'notifications';

/**
 * The inbox's two views (P12, P13): a segmented control over Conversations and Notifications in a 720 px column. The
 * view is kept in `?view=notifications` without a navigation, so a reload or a shared link opens the same view.
 */
export function InboxViews({ view }: { view: InboxView }) {
	const t = useTranslations('chat');
	const [current, setCurrent] = React.useState(view);

	const change = (next: string) => {
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
			{/* TODO(TASK-21.3): the conversation list. */}
			<TabsContent value="conversations" className="mt-6">
				<Placeholder title={t('inbox_title')} />
			</TabsContent>
			<TabsContent value="notifications">
				<NotificationsView />
			</TabsContent>
		</Tabs>
	);
}
