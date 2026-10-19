// /v1/conversations (C9): wiring only. Participant checks, blocks and read-only live in domains/chat.
import { Router } from 'express';

import {
	BlockInput,
	ConversationList,
	CreateConversationInput,
	CursorQuery,
	IdParams,
	IdResponse,
	Message,
	MessageList,
	MessageListQuery,
	SendMessageInput,
} from '@zivali/validation';

import ConversationsController from '../controllers/conversations.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { idempotency } from '../middleware/idempotency.middleware.ts';
import { requireVerifiedOrAnonymous } from '../middleware/permission.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/conversations');
const DAY_S = 86_400;

route(
	{
		method: 'post',
		path: '/',
		operationId: 'createConversation',
		summary: 'Open a conversation about a report',
		description:
			'Idempotent per report and caller (or per confirmed match). Participants: the caller and the report managers ' +
			'(with a match: the managers of both reports). Anonymous callers must manage a report themselves.',
		request: { body: CreateConversationInput },
		responses: { 200: { description: 'Conversation id', schema: IdResponse } },
		errors: ['UNAUTHENTICATED', 'UNVERIFIED_EMAIL', 'FORBIDDEN', 'NOT_FOUND', 'GONE', 'CONFLICT'],
	},
	authMiddleware,
	requireVerifiedOrAnonymous,
	rateLimit('contact', { limit: 10, window: DAY_S, key: 'user' }),
	ConversationsController.create
);

route(
	{
		method: 'get',
		path: '/',
		operationId: 'listConversations',
		summary: 'Own conversations',
		description: 'Latest activity first; aliases or chosen display names only, never contact data.',
		request: { query: CursorQuery },
		responses: { 200: { description: 'Conversations', schema: ConversationList } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	ConversationsController.list
);

route(
	{
		method: 'get',
		path: '/:id/messages',
		operationId: 'listMessages',
		summary: 'Messages of a conversation',
		description:
			'Oldest-first in every mode. `after` (exclusive, forward: catch-up after reconnect) or `before` (exclusive, ' +
			'backward); neither returns the latest `limit`. `next_cursor` goes into the same parameter, null at the end.',
		request: { params: IdParams, query: MessageListQuery },
		responses: { 200: { description: 'Messages', schema: MessageList } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
	},
	authMiddleware,
	ConversationsController.messages
);

route(
	{
		method: 'post',
		path: '/:id/messages',
		operationId: 'sendMessage',
		summary: 'Send a message',
		description:
			'Broadcast as message.created on conversation:<id>. Location messages only from a manager of the related ' +
			'report. Real accounts need a confirmed email (anonymous managers pass). Optional Idempotency-Key.',
		request: { params: IdParams, body: SendMessageInput },
		responses: { 201: { description: 'The stored message', schema: Message } },
		errors: ['UNAUTHENTICATED', 'UNVERIFIED_EMAIL', 'FORBIDDEN', 'GONE', 'CONFLICT'],
	},
	authMiddleware,
	requireVerifiedOrAnonymous,
	rateLimit('chat.message', { limit: 30, window: 60, key: 'user' }),
	rateLimit('chat.message_day', { limit: 500, window: DAY_S, key: 'user' }),
	idempotency(),
	ConversationsController.send
);

route(
	{
		method: 'post',
		path: '/:id/read',
		operationId: 'markConversationRead',
		summary: 'Mark a conversation read',
		description: 'Broadcasts conversation.read on conversation:<id>.',
		request: { params: IdParams },
		responses: { 204: { description: 'Marked read' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
	},
	authMiddleware,
	ConversationsController.read
);

route(
	{
		method: 'post',
		path: '/:id/block',
		operationId: 'blockParticipant',
		summary: 'Block another participant',
		description: 'Their further messages to you are refused.',
		request: { params: IdParams, body: BlockInput },
		responses: { 204: { description: 'Blocked' } },
		errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
	},
	authMiddleware,
	ConversationsController.block
);

export default router;
