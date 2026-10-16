// C10 notifications: inbox, prefs, quiet hours, push tokens. Endpoints are injectEndpoints stubs for TASK-22.3
// (`setQuietHours` is `PATCH /v1/me`): delete them when `gen:api` emits the generated ones. `subscribeInbox`
// (Realtime `user:<id>`, ADR-023) is hand-written and stays; point its tags at the generated ones then.
import type {
	CursorQuery,
	MarkNotificationsReadInput,
	Me,
	Notification,
	NotificationList,
	NotificationPref,
	NotificationPrefInput,
	NotificationPrefs,
	NotificationType,
	PushTokenInput,
	Uuid,
} from '@zivali/types';

import { type RealtimeClient, subscribeBroadcast } from './broadcast.ts';
import { api, type ApiStore } from './rtk.ts';

export const notificationsApi = api
	// 'Conversation' (chat.ts) is refreshed by the inbox channel's `conversation.updated`.
	.enhanceEndpoints({ addTagTypes: ['Notification', 'NotificationPrefs', 'Conversation'] })
	.injectEndpoints({
		endpoints: (build) => ({
			listNotifications: build.query<NotificationList, CursorQuery | void>({
				query: (params) => ({ url: '/v1/notifications', params: params ?? undefined }),
				providesTags: ['Notification'],
			}),
			markRead: build.mutation<void, MarkNotificationsReadInput>({
				query: (body) => ({ url: '/v1/notifications/read', method: 'POST', body }),
				invalidatesTags: ['Notification'],
			}),
			getPrefs: build.query<NotificationPrefs, void>({
				query: () => '/v1/notification-prefs',
				providesTags: ['NotificationPrefs'],
			}),
			setPref: build.mutation<NotificationPref, { type: NotificationType; body: NotificationPrefInput }>({
				query: ({ type, body }) => ({ url: `/v1/notification-prefs/${type}`, method: 'PUT', body }),
				invalidatesTags: ['NotificationPrefs'],
			}),
			setQuietHours: build.mutation<Me, { quiet_from: string | null; quiet_to: string | null }>({
				query: (body) => ({ url: '/v1/me', method: 'PATCH', body }),
				invalidatesTags: ['NotificationPrefs'],
			}),
			registerPushToken: build.mutation<void, PushTokenInput>({
				query: (body) => ({ url: '/v1/push-tokens', method: 'POST', body }),
			}),
			unregisterPushToken: build.mutation<void, { token: string }>({
				// C10 (CH-76): the token goes in the body, so it stays out of URLs and access logs.
				query: (body) => ({ url: '/v1/push-tokens', method: 'DELETE', body }),
			}),
		}),
	});

export const {
	useListNotificationsQuery,
	useMarkReadMutation,
	useGetPrefsQuery,
	useSetPrefMutation,
	useSetQuietHoursMutation,
	useRegisterPushTokenMutation,
	useUnregisterPushTokenMutation,
} = notificationsApi;

export type InboxEvent =
	{ event: 'notification.created'; payload: Notification } | { event: 'conversation.updated'; payload: unknown };

/**
 * Realtime for the signed-in user (`user:<id>`, private): new notifications and conversation changes re-fetch the
 * notification list (unread badge) and the conversation list; so does every (re)subscribe.
 *   useEffect(() => subscribeInbox(supabase, store.dispatch, userId, toast), [store, userId]);
 */
export function subscribeInbox(
	realtime: RealtimeClient,
	dispatch: ApiStore['dispatch'],
	userId: Uuid,
	onEvent?: (event: InboxEvent) => void
): () => void {
	const refresh = (...tags: ('Notification' | 'Conversation')[]) =>
		dispatch(notificationsApi.util.invalidateTags(tags));
	return subscribeBroadcast(
		realtime,
		`user:${userId}`,
		{
			'notification.created': (payload) => {
				refresh('Notification');
				onEvent?.({ event: 'notification.created', payload: payload as Notification });
			},
			'conversation.updated': (payload) => {
				refresh('Conversation');
				onEvent?.({ event: 'conversation.updated', payload });
			},
		},
		() => refresh('Notification', 'Conversation')
	);
}
