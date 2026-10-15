// audit_log (C1): every staff or destructive service call writes one row, inside its transaction when it has one.
import type { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

export type AuditEntry = {
	/** Who: the acting user, null for system actions (jobs, scripts). */
	actor_id: string | null;
	/** What, e.g. 'user.role.set', 'report.hide'. */
	action: string;
	target_type: string;
	target_id?: string | null;
	/** Before/after or the relevant fields; never secrets, contact data or exact points. */
	diff?: Record<string, unknown>;
	/** Free-text reason from the staff member; stored as diff.note. */
	note?: string;
};

export async function write(tx: Prisma.TransactionClient | undefined, entry: AuditEntry): Promise<void> {
	const db = tx ?? prisma;
	const { diff, note, ...row } = entry;
	const payload = note === undefined ? diff : { ...diff, note };
	await db.audit_log.create({ data: { ...row, ...(payload && { diff: payload as Prisma.InputJsonObject }) } });
}

export default { write };
