// Producing notifications (C10). Stub from TASK-6.3 so feature tasks can call it now: it sends notify.send (inside the
// caller's transaction when ctx.tx is set) and the stub handler logs it; TASK-22.3 adds the inbox, push and email.
import type { Ctx } from '../../lib/ctx.ts';

export type NotificationInput = { user_id: string; type: string; payload: object; dedupe_key?: string };

export async function enqueueNotification(input: NotificationInput, ctx: Ctx): Promise<void> {
	await ctx.jobs.send('notify.send', input, { tx: ctx.tx });
}

export default { enqueueNotification };
