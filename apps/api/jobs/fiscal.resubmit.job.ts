// fiscal.resubmit (C13 §Fiscal invoices, TASK-92.3): hourly cron in Europe/Ljubljana (lib/jobs.ts SCHEDULES); sends
// FAILED and stale PENDING invoices to FURS again (SubsequentSubmit) and alerts the admins after 24 h unverified.
import { InvoicesDomain } from '../domains/payments/index.ts';
import type { JobCtx } from './index.ts';

export async function handle(_data: unknown, ctx: JobCtx): Promise<void> {
	await InvoicesDomain.resubmitInvoices(undefined, ctx);
}
