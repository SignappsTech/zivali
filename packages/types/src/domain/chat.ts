// C9 chat: conversations, messages, blocks; Realtime Broadcast payloads are the Message DTO.
import type { IsoDateTime, LatLng, Page, Uuid } from './common.ts';
import type { AliasKey, ConversationStatus, MessageKind, ReportType, Species } from './enums.ts';

export type CreateConversationInput = { about_report_code: string; match_id?: Uuid };
export type Message = {
	id: Uuid;
	conversation_id: Uuid;
	sender_alias_key: AliasKey;
	sender_display_name?: string;
	kind: MessageKind;
	body: string;
	has_link: boolean;
	location?: LatLng;
	created_at: IsoDateTime;
};
export type MessageList = Page<Message>;
export type MessageListQuery = { after?: Uuid; before?: Uuid; limit?: number };
/** `location` is required for (and only allowed with) `kind: 'location'`. */
export type SendMessageInput = { body: string; kind?: 'text' | 'location'; location?: LatLng };
export type BlockInput = { participant_id: Uuid };
export type ConversationSummary = {
	id: Uuid;
	about_report: { short_code: string; type: ReportType; species: Species; thumb_url: string | null };
	my_alias_key: AliasKey;
	other_alias_key: AliasKey;
	other_display_name?: string;
	/** The other participant's user id: `participant_id` for block, `target_id` of a profile abuse report. */
	other_participant_id: Uuid | null;
	last_message_preview: string | null;
	unread: number;
	status: ConversationStatus;
};
export type ConversationList = Page<ConversationSummary>;
