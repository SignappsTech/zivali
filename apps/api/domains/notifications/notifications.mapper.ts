// Inbox rows and prefs → C10 DTOs.
import type { z } from 'zod';

import { Notification, NotificationPref } from '@zivali/validation';

import type { NotificationRow } from './notifications.dao.ts';

export function toNotificationDto(row: NotificationRow): z.infer<typeof Notification> {
	return Notification.parse({
		id: row.id,
		type: row.type,
		payload: row.payload,
		read_at: row.read_at?.toISOString() ?? null,
		created_at: row.created_at.toISOString(),
	});
}

export function toPrefDto(row: { type: string; in_app: boolean; push: boolean; email: boolean }) {
	return NotificationPref.parse({ type: row.type, in_app: row.in_app, push: row.push, email: row.email });
}

export default { toNotificationDto, toPrefDto };
