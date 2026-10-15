// Chat rows → C9 DTOs. Participants appear only as alias keys or their chosen display name, never ids, emails or
// phone numbers. The Message DTO is also the message.created broadcast payload (ADR-023).
import type { z } from 'zod';

import type { AliasKey } from '@zivali/types';
import { ConversationList, Message } from '@zivali/validation';

import type { ConversationListRow, MessageRow, ParticipantRole, ReportSide } from './chat.dao.ts';

export type MessageDto = z.infer<typeof Message>;
export type ConversationListDto = z.infer<typeof ConversationList>;

const PREVIEW_MAX = 100;

/**
 * owner and contact map 1:1; a finder is shown by the found or sighted report they manage: `shelter` for an
 * organisation intake, `sighter` for a sighting, else `finder`.
 */
export function aliasKey(role: ParticipantRole, finderSide: Pick<ReportSide, 'type' | 'source'> | null): AliasKey {
	if (role !== 'finder') return role;
	if (finderSide?.source === 'organisation') return 'shelter';
	return finderSide?.type === 'sighted' ? 'sighter' : 'finder';
}

export type Sender = { alias_key: AliasKey; display_name: string | null };

/** `sender` is null for kind 'system' (no sender row); C9 has no alias key for it, so it reads as `contact`. */
export function toMessageDto(row: MessageRow, sender: Sender | null): MessageDto {
	const location = row.location as { lat: number; lng: number } | null;
	return Message.parse({
		id: row.id,
		conversation_id: row.conversation_id,
		sender_alias_key: sender?.alias_key ?? 'contact',
		sender_display_name: sender?.display_name ?? undefined,
		kind: row.kind,
		body: row.body,
		has_link: row.has_link,
		location: location ?? undefined,
		created_at: row.created_at.toISOString(),
	});
}

export function toConversationListDto(rows: ConversationListRow[], next_cursor: string | null): ConversationListDto {
	return ConversationList.parse({
		items: rows.map((row) => {
			// The found or sighted side: the matched report, else the report the conversation is about.
			const finderSide = row.other_type
				? { type: row.other_type, source: row.other_source! }
				: { type: row.type, source: row.source };
			return {
				id: row.id,
				about_report: {
					short_code: row.short_code,
					type: row.type,
					species: row.species,
					thumb_url: row.thumb_url,
				},
				my_alias_key: aliasKey(row.my_role, finderSide),
				other_alias_key: aliasKey(row.other_role ?? 'contact', finderSide),
				other_display_name: row.other_alias ?? undefined,
				last_message_preview: row.last_body?.slice(0, PREVIEW_MAX) ?? null,
				unread: row.unread,
				status: row.status,
			};
		}),
		next_cursor,
	});
}

export default { aliasKey, toMessageDto, toConversationListDto };
