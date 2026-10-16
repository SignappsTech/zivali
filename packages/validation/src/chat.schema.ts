// C9 chat: conversations, messages (also the Realtime Broadcast payload), blocks.
import { IsoDateTime, LatLng, limit, page, ShortCode, text, Uuid } from './common.schema.ts';
import { AliasKey, ConversationStatus, MessageKind, ReportType, Species } from './enums.ts';
import { z } from './zod.ts';

export const CreateConversationInput = z
	.object({ about_report_code: ShortCode, match_id: Uuid.optional() })
	.openapi('CreateConversationInput');
export const Message = z
	.object({
		id: Uuid,
		conversation_id: Uuid,
		sender_alias_key: AliasKey,
		sender_display_name: z.string().optional(),
		kind: MessageKind,
		body: z.string(),
		has_link: z.boolean(),
		location: LatLng.optional(),
		created_at: IsoDateTime,
	})
	.openapi('Message', { description: 'Chat message; rendered as plain text, links never linkified.' });
export const MessageList = page(Message).openapi('MessageList');
export const MessageListQuery = z.object({ after: Uuid.optional(), before: Uuid.optional(), limit: limit(50) });
export const SendMessageInput = z
	.object({ body: text(2000), kind: z.enum(['text', 'location']).optional(), location: LatLng.optional() })
	.refine((m) => (m.kind === 'location') === (m.location !== undefined), {
		message: 'location goes with kind "location" only',
		path: ['location'],
	})
	.openapi('SendMessageInput');
export const BlockInput = z.object({ participant_id: Uuid }).openapi('BlockInput');
export const ConversationSummary = z
	.object({
		id: Uuid,
		about_report: z.object({
			short_code: z.string(),
			type: ReportType,
			species: Species,
			thumb_url: z.string().nullable(),
		}),
		my_alias_key: AliasKey,
		other_alias_key: AliasKey,
		other_display_name: z.string().optional(),
		other_participant_id: Uuid.nullable().openapi({
			description: 'User id of the other participant, for block (participant_id) and a profile abuse report.',
		}),
		last_message_preview: z.string().nullable(),
		unread: z.number().int().min(0),
		status: ConversationStatus,
	})
	.openapi('ConversationSummary');
export const ConversationList = page(ConversationSummary).openapi('ConversationList');
