// directory.reminder (C18, FR-044 R-044.3): cron 1 April 08:00 Europe/Ljubljana (lib/jobs.ts SCHEDULES); emails the
// admins the directory entries verified more than 12 months ago.
import { DirectoryAdminDomain } from '../domains/directory/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	await DirectoryAdminDomain.sendReminder(undefined, ctx);
}
