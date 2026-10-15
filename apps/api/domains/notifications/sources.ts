// Variables per notification type. The notify.send job holds ids and a template key only (it is stored in
// pgboss.job, TASK-6.17), so the handler loads the copy variables (C10 §Types payload) at send time from those ids.
// The feature that owns a type's data adds its source here (one line, like a route mount): matching (match_*),
// chat (chat_message), report lifecycle and moderation (report_*), alerts (nearby_lost, from the report and the
// recipient's subscription), payments (payment_receipt). A source returns null when the notification is moot by now
// (report closed or reunited, conversation read): the handler then drops it. A type without a source fails its job.
import type { z } from 'zod';

import type { Locale, NotificationType } from '@zivali/types';
import type { NotificationJobPayload } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';

export type Recipient = { user_id: string; locale: Locale };
export type Source = (
	payload: z.infer<typeof NotificationJobPayload>,
	recipient: Recipient,
	ctx: Ctx
) => Promise<Record<string, unknown> | null>;

export const sources: Partial<Record<NotificationType, Source>> = {};

export default sources;
