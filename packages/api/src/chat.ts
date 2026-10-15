// C9 chat. Endpoints are injectEndpoints stubs for TASK-21.2 (owner of the REST routes): delete them when
// `gen:api` emits the generated ones. `subscribeConversation` (Realtime, ADR-023) is hand-written and stays.
import type {
	BlockInput,
	ConversationList,
	CreateConversationInput,
	CursorQuery,
	IdResponse,
	Message,
	MessageList,
	MessageListQuery,
	SendMessageInput,
	Uuid,
} from '@zivali/types';

import { type RealtimeClient, subscribeBroadcast } from './broadcast.ts';
import { api, type ApiStore } from './rtk.ts';

export const chatApi = api.enhanceEndpoints({ addTagTypes: ['Conversation', 'Message'] }).injectEndpoints({
	endpoints: (build) => ({
		createConversation: build.mutation<IdResponse, CreateConversationInput>({
			query: (body) => ({ url: '/v1/conversations', method: 'POST', body }),
			invalidatesTags: ['Conversation'],
		}),
		listConversations: build.query<ConversationList, CursorQuery | void>({
			query: (params) => ({ url: '/v1/conversations', params: params ?? undefined }),
			providesTags: ['Conversation'],
		}),
		listMessages: build.query<MessageList, MessageListQuery & { id: Uuid }>({
			query: ({ id, ...params }) => ({ url: `/v1/conversations/${id}/messages`, params }),
			providesTags: (_result, _error, { id }) => [{ type: 'Message', id }],
		}),
		sendMessage: build.mutation<Message, { id: Uuid; body: SendMessageInput }>({
			query: ({ id, body }) => ({ url: `/v1/conversations/${id}/messages`, method: 'POST', body }),
			invalidatesTags: ['Conversation'],
		}),
		markConversationRead: build.mutation<void, { id: Uuid }>({
			query: ({ id }) => ({ url: `/v1/conversations/${id}/read`, method: 'POST' }),
			invalidatesTags: ['Conversation'],
		}),
		blockParticipant: build.mutation<void, { id: Uuid; body: BlockInput }>({
			query: ({ id, body }) => ({ url: `/v1/conversations/${id}/block`, method: 'POST', body }),
		}),
	}),
});

export const {
	useCreateConversationMutation,
	useListConversationsQuery,
	useListMessagesQuery,
	useSendMessageMutation,
	useMarkConversationReadMutation,
	useBlockParticipantMutation,
} = chatApi;

type Store = Pick<ApiStore, 'dispatch' | 'getState'>;
const CATCH_UP_LIMIT = 50;

/** Cached `listMessages` entries that show the latest messages of the conversation (not older or catch-up pages). */
const latestArgs = (store: Store, id: Uuid) =>
	chatApi.util
		.selectCachedArgsForQuery(store.getState(), 'listMessages')
		.filter((arg) => arg.id === id && !arg.after && !arg.before);

/** Appends messages (oldest first, C9) to those entries, skipping ids already there. */
function mergeMessages(store: Store, id: Uuid, messages: Message[]): void {
	for (const arg of latestArgs(store, id))
		store.dispatch(
			chatApi.util.updateQueryData('listMessages', arg, (draft) => {
				for (const message of messages)
					if (!draft.items.some((item) => item.id === message.id)) draft.items.push(message);
			})
		);
}

/** `GET …/messages?after=<last id>` until a short page, so nothing sent while disconnected is lost (C9). */
async function catchUp(store: Store, id: Uuid): Promise<void> {
	const [arg] = latestArgs(store, id);
	// `as never`: the store's state type does not list injected endpoints; at runtime it is the same slice.
	let after =
		arg &&
		chatApi.endpoints.listMessages
			.select(arg)(store.getState() as never)
			.data?.items.at(-1)?.id;
	while (after) {
		const { data } = await store.dispatch(
			chatApi.endpoints.listMessages.initiate(
				{ id, after, limit: CATCH_UP_LIMIT },
				{ subscribe: false, forceRefetch: true }
			)
		);
		if (!data) return;
		mergeMessages(store, id, data.items);
		after = data.items.length === CATCH_UP_LIMIT ? data.items.at(-1)?.id : undefined;
	}
}

/**
 * Realtime for an open conversation (`conversation:<id>`, private): `message.created` lands in the cached
 * `useListMessagesQuery({ id })` data; every (re)subscribe fetches the messages after the last cached one.
 *   useEffect(() => subscribeConversation(supabase, store, id, { read }), [store, id]);  // store = useStore()
 */
export function subscribeConversation(
	realtime: RealtimeClient,
	store: Store,
	id: Uuid,
	on: { read?: (payload: unknown) => void } = {}
): () => void {
	return subscribeBroadcast(
		realtime,
		`conversation:${id}`,
		{
			'message.created': (message) => mergeMessages(store, id, [message as Message]),
			'conversation.read': (payload) => on.read?.(payload),
		},
		() => void catchUp(store, id)
	);
}
