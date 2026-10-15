// notify.send variables for chat_message (C10 fields: conversation_id, preview_alias, unread_count), derived from the
// job's thread_id and message_id only, never the message body. Null when the message or its unread state is gone.
import type { Source } from '../notifications/sources.ts';
import ChatDao, { type ParticipantRole } from './chat.dao.ts';
import ChatMapper from './chat.mapper.ts';

export const chatMessageVars: Source = async ({ thread_id, message_id }, recipient) => {
	if (!thread_id || !message_id) return null;
	const [conversation, message] = await Promise.all([
		ChatDao.findConversation(thread_id),
		ChatDao.findMessage(thread_id, message_id),
	]);
	if (!conversation || !message) return null;
	const unread_count = await ChatDao.countUnread(thread_id, recipient.user_id);
	if (unread_count === 0) return null;
	const from = conversation.participants.find((p) => p.user_id === message.sender_id);
	const [side] = await ChatDao.findReportSides([conversation.other_report_id ?? conversation.about_report_id]);
	const preview_alias =
		from?.alias ?? ChatMapper.aliasKey((from?.role ?? 'contact') as ParticipantRole, side ?? null);
	return { conversation_id: thread_id, preview_alias, unread_count };
};
