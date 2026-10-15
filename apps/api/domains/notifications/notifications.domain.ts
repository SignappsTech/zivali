// Producing notifications (C10). Stub from TASK-6.3 so feature tasks can call it now: it sends notify.send (inside the
// caller's transaction when ctx.tx is set) and the stub handler logs it; TASK-22.3 adds the inbox, push and email.
import type { z } from 'zod';

import { NotificationJobInput } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';

export type NotificationInput = z.input<typeof NotificationJobInput>;

export async function enqueueNotification(input: NotificationInput, ctx: Ctx): Promise<void> {
	// The payload lands in pgboss.job: ids and a template key only; anything else throws before it is stored.
	await ctx.jobs.send('notify.send', NotificationJobInput.parse(input), { tx: ctx.tx });
}

export default { enqueueNotification };
