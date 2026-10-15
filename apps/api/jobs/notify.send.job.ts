// notify.send (C10): one notification to one user; NotificationsDomain.deliver parses the job and does the work.
import { NotificationsDomain } from '../domains/notifications/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	await NotificationsDomain.deliver(data, ctx);
}
