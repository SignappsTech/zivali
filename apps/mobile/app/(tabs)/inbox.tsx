import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { useListConversationsQuery } from '@zivali/api/chat';
import { subscribeInbox, useListNotificationsQuery } from '@zivali/api/notifications';
import type { ApiStore } from '@zivali/api/rtk';
import { ConversationRow } from '@/components/chat/conversations';
import { InlineError, Loading, NotificationsView } from '@/components/notifications/notifications-view';
import { SignInButtons, Spot } from '@/components/shell/parts';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase';

type InboxView = 'conversations' | 'notifications';
const named = (view?: string): InboxView | undefined =>
	view === 'conversations' || view === 'notifications' ? view : undefined;

/** How long the inbox waits for both lists before it opens Conversations anyway. */
const WAIT_MS = 2000;

/**
 * Where the inbox has unread items: any conversation with unread messages (the list's first page, newest activity
 * first, C9) and any unread notification (C10 `unread`); the same requests as the two views. `loaded` once both
 * answered, `failed` once either gave up. The open view's `subscribeInbox` re-fetches both, so this follows Realtime.
 */
function useInboxUnread() {
	const conversations = useListConversationsQuery();
	const notifications = useListNotificationsQuery();
	return {
		conversations: Boolean(conversations.data?.items.some((conversation) => conversation.unread > 0)),
		notifications: Boolean(notifications.data?.unread),
		loaded: Boolean(conversations.data && notifications.data),
		failed: conversations.isError || notifications.isError,
	};
}

/** A view's segment: its label, and while it has unread items the rows' 10 px `primary` dot and ", neprebrano". */
function ViewTrigger({ value, label, unread }: { value: InboxView; label: string; unread: boolean }) {
	const t = useTranslations('chat');
	return (
		<TabsTrigger
			value={value}
			aria-label={unread ? t('row_unread_a11y', { title: label }) : label}
			className="flex-row gap-1.5"
		>
			<Text>{label}</Text>
			{unread ? <View aria-hidden className="size-2.5 rounded-full bg-primary" /> : null}
		</TabsTrigger>
	);
}

// Inbox tab (P2 A3 signed out). Signed in: the inbox (below). Anonymous managers chat from the manage screen (`m`), so
// they see the signed-out state here.
export default function InboxTab() {
	const t = useTranslations();
	const { session, isAnonymous, loading } = useSession();
	if (loading) return <View className="flex-1 bg-background" />;

	if (!session || isAnonymous) {
		return (
			<SafeAreaView edges={['top']} className="flex-1 bg-background px-5">
				<View className="flex-1 justify-center">
					<Spot icon={ChatCircleIcon} />
					<Text role="heading" className="mt-8 font-display text-3xl tracking-[-0.6px]">
						{t('inbox.signed_out_title')}
					</Text>
					<Text className="mt-3 text-lg">{t('inbox.signed_out_body')}</Text>
					<View className="mt-5 flex-row items-center gap-2">
						<Icon as={HandHeartIcon} size={16} className="text-muted-foreground" />
						<Text className="flex-1 text-sm text-muted-foreground">{t('inbox.signed_out_note')}</Text>
					</View>
				</View>
				<SignInButtons
					className="pb-6"
					signIn={t('inbox.signed_out_sign_in')}
					create={t('inbox.signed_out_create')}
				/>
			</SafeAreaView>
		);
	}

	return <Inbox />;
}

/**
 * Signed in: h1 "Sporočila" and the P12 segmented control between Conversations (P12) and Notifications (P13); each
 * segment carries its unread state. `?view=` (C15) names a view; without one the inbox opens where the unread items
 * are, Conversations first (TASK-114.10, as on the web): until both lists answered no view is open (the loading rows),
 * so it never opens one view and jumps to the other; a failed list or WAIT_MS without an answer opens Conversations.
 */
function Inbox() {
	const t = useTranslations('chat');
	const params = useLocalSearchParams<{ view?: string }>();
	const unread = useInboxUnread();
	const [chosen, setChosen] = React.useState(named(params.view));
	// A later deep link (C15) changes the param while the tab is mounted: adjust state during render.
	const [seenParam, setSeenParam] = React.useState(params.view);
	if (params.view !== seenParam) {
		setSeenParam(params.view);
		if (named(params.view)) setChosen(named(params.view));
	}
	// Fixed once decided, so a later notification never moves the reader to another view.
	if (!chosen && (unread.loaded || unread.failed))
		setChosen(unread.loaded && unread.notifications && !unread.conversations ? 'notifications' : 'conversations');
	React.useEffect(() => {
		if (chosen) return;
		const timer = setTimeout(() => setChosen((now) => now ?? 'conversations'), WAIT_MS);
		return () => clearTimeout(timer);
	}, [chosen]);

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			{/* No view yet: an empty value selects no segment and opens no view. */}
			<Tabs value={chosen ?? ''} onValueChange={(view) => setChosen(view as InboxView)} className="flex-1 gap-0">
				<View className="px-5 pt-3">
					<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
						{t('inbox_title')}
					</Text>
					<TabsList aria-label={t('inbox_title')} className="mt-4">
						<ViewTrigger
							value="conversations"
							label={t('view_conversations')}
							unread={unread.conversations}
						/>
						<ViewTrigger
							value="notifications"
							label={t('view_notifications')}
							unread={unread.notifications}
						/>
					</TabsList>
				</View>
				{chosen ? null : <Loading className="px-5" />}
				<TabsContent value="conversations" className="flex-1 pt-2">
					<ConversationsView />
				</TabsContent>
				<TabsContent value="notifications" className="flex-1">
					<NotificationsView />
				</TabsContent>
			</Tabs>
		</SafeAreaView>
	);
}

/**
 * P12 Conversations view: newest activity first (C9), unread rows bold with the primary dot. `conversation.updated`
 * on `user:<id>` re-fetches the list, so previews and unread counts follow in real time.
 */
function ConversationsView() {
	const t = useTranslations('chat');
	const router = useRouter();
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const userId = useSession().session?.user.id;
	const { data, isLoading, isError, isFetching, refetch } = useListConversationsQuery();

	React.useEffect(() => (userId ? subscribeInbox(supabase, dispatch, userId) : undefined), [dispatch, userId]);

	if (isLoading) return <Loading className="px-5" />;
	if (isError && !data)
		return <InlineError className="mx-5 mt-5" retrying={isFetching} onRetry={() => void refetch()} />;
	if (!data?.items.length)
		return (
			<View className="flex-1 justify-center px-5 pb-10">
				<EmptyState title={t('empty_title')} description={t('empty_body')} />
			</View>
		);
	return (
		<ScrollView contentContainerClassName="gap-1 px-2 pb-6 pt-2">
			{data.items.map((conversation) => (
				<ConversationRow
					key={conversation.id}
					conversation={conversation}
					onPress={() => router.push(`/inbox/${conversation.id}` as Href)}
				/>
			))}
		</ScrollView>
	);
}
