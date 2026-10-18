// Chat between report managers and the people contacting them (C9, FR-009, ADR-023). Only participants read or
// write a conversation; every new message is broadcast on conversation:<id> in the same transaction, other
// participants get conversation.updated on user:<id> and, when offline, a chat_message notification (C10).
import { z } from 'zod';

import type { CreateConversationInput, MessageListQuery, SendMessageInput } from '@zivali/types';
import { Uuid } from '@zivali/validation';
import { coarsenPoint } from '@zivali/validation/geo';

import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import { broadcast } from '../../lib/realtime.ts';
import { prisma, type Prisma } from '../../prisma/prisma.ts';
import { NotificationsDomain } from '../notifications/index.ts';
import ChatDao, { type ConversationListRow, type ConversationRow, type ParticipantRole } from './chat.dao.ts';
import ChatMapper, { type MessageDto, type Sender } from './chat.mapper.ts';

const DEFAULT_LIMIT = 30;
/** One chat_message notification per conversation per 5-minute window (dedupe key, C10). */
const NOTIFY_WINDOW_MS = 5 * 60_000;
/** Clients mark a conversation read while it is open; a read this recent counts as online (no notification). */
const ONLINE_MS = 2 * 60_000;
const OPEN_STATUSES = new Set(['open', 'matched']);
/**
 * Links get a caution in clients and are never linkified: a scheme (https://, ftp://, …), www., or a bare host on any
 * TLD (is.gd/x, foo.dev): dot-separated labels ending in 2+ letters, so numbers (3.14, 17.30) and e.g. are no links;
 * an all-digit label before the TLD reads as an ordinal ("2.nadstropje", "5.maja"), not a host.
 */
const LINK = /\b[a-z][a-z0-9+.-]*:\/\/\S|\bwww\.\S|\b(?:[a-z0-9-]+\.)+(?<!\b\d+\.)[a-z]{2,63}\b/i;
export const hasLink = (body: string): boolean => LINK.test(body);
const RetentionMonths = z.number().int().positive();

function actorId(ctx: Ctx): string {
	if (!ctx.actor) throw new AppError('UNAUTHENTICATED', 'Sign in required');
	return ctx.actor.user_id;
}

function inTransaction<T>(ctx: Ctx, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	return ctx.tx ? fn(ctx.tx) : prisma.$transaction(fn);
}

const invalid = (path: string, message: string) => new AppError('VALIDATION', message, undefined, [{ path, message }]);

/**
 * POST /v1/conversations: idempotent per report and caller (or per match). Without a match the caller is the
 * `contact` and the report's managers are `owner` (lost) or `finder` (found, sighted); with a confirmed match the
 * caller manages one side and the managers of the lost and the other report join. Anonymous callers must manage a
 * report themselves (anonymous finders through their manage link, C7).
 */
export async function openConversation(input: CreateConversationInput, ctx: Ctx): Promise<{ id: string }> {
	const user_id = actorId(ctx);
	if (ctx.actor!.is_anonymous && !(await ChatDao.isManager(user_id, undefined, ctx.tx)))
		throw new AppError('FORBIDDEN', 'Anonymous users can only chat about reports they manage');
	const report = await ChatDao.findReportByCode(input.about_report_code, ctx.tx);
	const managers = report?.managers.map((manager) => manager.user_id) ?? [];
	if (!report || (!managers.includes(user_id) && report.moderation_state !== 'visible'))
		throw new AppError('NOT_FOUND', 'Report not found');
	const assertOpen = () => {
		if (!OPEN_STATUSES.has(report.status)) throw new AppError('GONE', 'Report is closed');
	};

	return inTransaction(ctx, async (tx) => {
		if (input.match_id) {
			const match = await ChatDao.findMatch(input.match_id, tx);
			if (!match || (match.lost_report_id !== report.id && match.other_report_id !== report.id))
				throw new AppError('NOT_FOUND', 'Match not found');
			const sides = await ChatDao.findManagers([match.lost_report_id, match.other_report_id], tx);
			if (!sides.some((side) => side.user_id === user_id)) throw new AppError('FORBIDDEN', 'Not your match');
			if (match.state !== 'confirmed') throw new AppError('FORBIDDEN', 'Match is not confirmed');
			await ChatDao.lockKey(`chat:match:${match.id}`, tx);
			const existing = await ChatDao.findByMatch(match.id, tx);
			if (existing) return existing;
			assertOpen();
			const roles = new Map<string, ParticipantRole>();
			for (const side of sides)
				if (!roles.has(side.user_id))
					roles.set(side.user_id, side.report_id === match.lost_report_id ? 'owner' : 'finder');
			return ChatDao.createConversation(
				{
					about_report_id: report.id,
					lost_report_id: match.lost_report_id,
					other_report_id: match.other_report_id,
					match_id: match.id,
				},
				[...roles].map(([id, role]) => ({ user_id: id, role })),
				tx
			);
		}
		if (managers.includes(user_id)) throw new AppError('FORBIDDEN', 'You manage this report');
		await ChatDao.lockKey(`chat:${report.id}:${user_id}`, tx);
		const existing = await ChatDao.findContact(report.id, user_id, tx);
		if (existing) return existing;
		assertOpen();
		const role: ParticipantRole = report.type === 'lost' ? 'owner' : 'finder';
		return ChatDao.createConversation(
			{ about_report_id: report.id },
			[{ user_id, role: 'contact' }, ...managers.map((id) => ({ user_id: id, role }))],
			tx
		);
	});
}

// Opaque inbox cursor: base64url of "<activity_at as text, microseconds kept>|<id>", a position that stays valid
// when messages arrive between pages.
const CURSOR_TS = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(\.\d{1,6})?[+-]\d\d(:\d\d)?$/;
const encodeCursor = (row: { activity_text: string; id: string }) =>
	Buffer.from(`${row.activity_text}|${row.id}`).toString('base64url');
function decodeCursor(cursor: string): { activity_at: string; id: string } | null {
	const [activity_at, id, extra] = Buffer.from(cursor, 'base64url').toString().split('|');
	if (extra !== undefined || !activity_at || !id || !CURSOR_TS.test(activity_at) || !Uuid.safeParse(id).success)
		return null;
	return { activity_at, id };
}

export async function listConversations(
	input: { cursor?: string; limit?: number },
	ctx: Ctx
): Promise<{ rows: ConversationListRow[]; next_cursor: string | null }> {
	const user_id = actorId(ctx);
	const cursor = input.cursor === undefined ? null : decodeCursor(input.cursor);
	if (input.cursor !== undefined && !cursor) throw invalid('cursor', 'Invalid cursor');
	const limit = input.limit ?? DEFAULT_LIMIT;
	const rows = await ChatDao.listConversations(user_id, cursor, limit + 1, ctx.tx);
	const page = rows.slice(0, limit);
	return { rows: page, next_cursor: rows.length > limit ? encodeCursor(page.at(-1)!) : null };
}

/** The conversation with the caller's participant row; FORBIDDEN for non-participants and unknown ids alike. */
async function participantOf(conversation_id: string, ctx: Ctx, tx?: Prisma.TransactionClient) {
	const user_id = actorId(ctx);
	const conversation = await ChatDao.findConversation(conversation_id, tx);
	const me = conversation?.participants.find((participant) => participant.user_id === user_id);
	if (!conversation || !me) throw new AppError('FORBIDDEN', 'Not a participant of this conversation');
	return { conversation, me };
}

/** Alias and display name per participant; finders are named by the found or sighted report's type and source. */
async function sendersOf(conversation: ConversationRow, tx?: Prisma.TransactionClient): Promise<Map<string, Sender>> {
	const [side] = await ChatDao.findReportSides([conversation.other_report_id ?? conversation.about_report_id], tx);
	return new Map(
		conversation.participants.map((participant) => [
			participant.user_id,
			{
				alias_key: ChatMapper.aliasKey(participant.role as ParticipantRole, side ?? null),
				display_name: participant.alias,
			},
		])
	);
}

/** Oldest-first pages; `after` and `before` are exclusive message-id cursors (C9). */
export async function listMessages(
	input: { conversation_id: string } & MessageListQuery,
	ctx: Ctx
): Promise<{ items: MessageDto[]; next_cursor: string | null }> {
	const { conversation } = await participantOf(input.conversation_id, ctx, ctx.tx);
	if (input.after && input.before) throw invalid('before', 'Use either after or before');
	const cursorId = input.after ?? input.before;
	const position = cursorId ? await ChatDao.findMessage(conversation.id, cursorId, ctx.tx) : undefined;
	if (cursorId && !position) throw invalid(input.after ? 'after' : 'before', 'Unknown message');
	const limit = input.limit ?? DEFAULT_LIMIT;
	const forward = Boolean(input.after);
	const rows = await ChatDao.listMessages(
		conversation.id,
		{
			after: forward ? position! : undefined,
			before: forward ? undefined : (position ?? undefined),
			take: limit + 1,
		},
		ctx.tx
	);
	const page = rows.slice(0, limit);
	const items = forward ? page : page.reverse();
	const more = rows.length > limit;
	const senders = await sendersOf(conversation, ctx.tx);
	return {
		items: items.map((row) => ChatMapper.toMessageDto(row, (row.sender_id && senders.get(row.sender_id)) || null)),
		next_cursor: more ? (forward ? items.at(-1)!.id : items[0]!.id) : null,
	};
}

/**
 * Stores and broadcasts a message. Refused for non-participants and senders blocked by another participant
 * (FORBIDDEN), in read-only conversations (GONE), and for location shares by anyone but a manager of one of the
 * conversation's reports (R-004.3; the point is coarsened like every stored location, C6).
 */
export async function sendMessage(
	input: { conversation_id: string } & SendMessageInput,
	ctx: Ctx
): Promise<MessageDto> {
	const user_id = actorId(ctx);
	return inTransaction(ctx, async (tx) => {
		// Lock first, read after: a close that commits meanwhile is seen, a later close waits for this send.
		await ChatDao.lockConversation(input.conversation_id, tx);
		const { conversation } = await participantOf(input.conversation_id, ctx, tx);
		if (conversation.status === 'read_only') throw new AppError('GONE', 'This conversation is read-only');
		const others = conversation.participants.filter((participant) => participant.user_id !== user_id);
		const blocked = await ChatDao.isBlockedBy(
			user_id,
			others.map((other) => other.user_id),
			tx
		);
		if (blocked) throw new AppError('FORBIDDEN', 'You cannot send messages in this conversation');
		const kind = input.kind ?? 'text';
		if (kind === 'location') {
			const { about_report_id, lost_report_id, other_report_id } = conversation;
			const reports = [about_report_id, lost_report_id, other_report_id].filter((id) => id !== null);
			if (!(await ChatDao.isManager(user_id, reports, tx)))
				throw new AppError('FORBIDDEN', 'Only a manager of the report can share a location');
		}
		const row = await ChatDao.insertMessage(
			{
				conversation_id: conversation.id,
				sender_id: user_id,
				kind,
				body: input.body,
				location: kind === 'location' ? coarsenPoint(input.location!) : undefined,
				has_link: hasLink(input.body),
			},
			tx
		);
		const sender = (await sendersOf(conversation, tx)).get(user_id)!;
		const message = ChatMapper.toMessageDto(row, sender);
		await broadcast(`conversation:${conversation.id}`, 'message.created', message, tx);

		const updated = {
			conversation_id: conversation.id,
			status: conversation.status,
			updated_at: message.created_at,
		};
		const window = Math.floor(ctx.now.getTime() / NOTIFY_WINDOW_MS);
		for (const other of others) {
			await broadcast(`user:${other.user_id}`, 'conversation.updated', updated, tx);
			const online = other.last_read_at && ctx.now.getTime() - other.last_read_at.getTime() < ONLINE_MS;
			if (other.muted || online) continue;
			// Ids only, never the body (C10, TASK-6.17): notify.send derives preview_alias and unread_count.
			await NotificationsDomain.enqueueNotification(
				{
					user_id: other.user_id,
					type: 'chat_message',
					payload: { template: 'chat_message', thread_id: conversation.id, message_id: row.id },
					dedupe_key: `chat:${conversation.id}:${window}`,
				},
				{ ...ctx, tx }
			);
		}
		return message;
	});
}

/**
 * Marks the conversation read up to now, with the caller's chat_message notifications about it, and broadcasts
 * conversation.read to the participants.
 */
export async function markRead(input: { conversation_id: string }, ctx: Ctx): Promise<void> {
	const user_id = actorId(ctx);
	await inTransaction(ctx, async (tx) => {
		const { conversation } = await participantOf(input.conversation_id, ctx, tx);
		const last_read_message_id = await ChatDao.latestMessageId(conversation.id, tx);
		await ChatDao.setLastRead(conversation.id, user_id, ctx.now, tx);
		await NotificationsDomain.markConversationRead({ conversation_id: conversation.id }, { ...ctx, tx });
		await broadcast(
			`conversation:${conversation.id}`,
			'conversation.read',
			{
				conversation_id: conversation.id,
				reader_id: user_id,
				last_read_message_id,
				read_at: ctx.now.toISOString(),
			},
			tx
		);
	});
}

/** The caller blocks another participant: their further messages are refused (blocks are account-wide). */
export async function blockParticipant(
	input: { conversation_id: string; participant_id: string },
	ctx: Ctx
): Promise<void> {
	const user_id = actorId(ctx);
	const { conversation } = await participantOf(input.conversation_id, ctx, ctx.tx);
	const target = conversation.participants.find((participant) => participant.user_id === input.participant_id);
	if (!target || target.user_id === user_id)
		throw invalid('participant_id', 'Not another participant of this conversation');
	await ChatDao.upsertBlock(user_id, target.user_id, ctx.tx);
}

/**
 * Conversations about a report become read-only when it closes. The report close and reunite transitions call this
 * inside their transaction (TASK-26.3); participants get conversation.updated on user:<id>.
 */
export async function closeForReport(input: { report_id: string }, ctx: Ctx): Promise<number> {
	return inTransaction(ctx, async (tx) => {
		const rows = await ChatDao.markReadOnly(input.report_id, ctx.now, tx);
		const updated_at = ctx.now.toISOString();
		for (const row of rows)
			for (const participant of row.participants)
				await broadcast(
					`user:${participant.user_id}`,
					'conversation.updated',
					{ conversation_id: row.id, status: 'read_only', updated_at },
					tx
				);
		return rows.length;
	});
}

/** retention.purge: read-only conversations closed `retention.chat_months` (6) ago are deleted with their messages. */
export async function purgeExpired(_input: void, ctx: Ctx): Promise<number> {
	const months = RetentionMonths.safeParse(await configStore.get('retention.chat_months')).data ?? 6;
	const cutoff = new Date(ctx.now);
	cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
	return ChatDao.deleteClosedBefore(cutoff, ctx.tx);
}

export default {
	openConversation,
	listConversations,
	listMessages,
	sendMessage,
	markRead,
	blockParticipant,
	closeForReport,
	purgeExpired,
};
