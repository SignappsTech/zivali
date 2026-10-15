// C9 examples (wire shape), served with createMockApi().
import type { ConversationList, IdResponse, Message, MessageList } from '@zivali/types';

export const conversationId = 'c9a1d2e3-0000-4000-8000-000000000001';

/** Broadcast on conversation:<id>, event message.created (and the 201 of POST …/messages). */
export const message: Message = {
	id: '3f0b7c1e-0000-4000-8000-000000000002',
	conversation_id: conversationId,
	sender_alias_key: 'finder',
	kind: 'text',
	body: 'Je pri meni, lahko pridete po 17h.',
	has_link: false,
	created_at: '2026-10-14T16:02:11Z',
};

/** Oldest first. */
export const messages: MessageList = {
	items: [
		{
			...message,
			id: '3f0b7c1e-0000-4000-8000-000000000001',
			sender_alias_key: 'you',
			body: 'Pozdravljeni, to je moj Piko.',
			created_at: '2026-10-14T15:58:40Z',
		},
	],
	next_cursor: null,
};

export const conversations: ConversationList = {
	items: [
		{
			id: conversationId,
			about_report: { short_code: 'Hk3vT9qP', type: 'found', species: 'dog', thumb_url: null },
			other_alias_key: 'finder',
			last_message_preview: message.body,
			unread: 1,
			status: 'active',
		},
	],
	next_cursor: null,
};

export const conversationCreated: IdResponse = { id: conversationId };
