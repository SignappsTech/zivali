// Staff DTOs for abuse reports and moderation flags (C11). The reporter is an id only; these never reach the
// reported user.
import type { z } from 'zod';

import { AdminAbuseReport, ModerationFlag } from '@zivali/validation';

import type { abuse_reports, moderation_flags } from '../../generated/client.ts';

export function toAdminAbuseReportDto(row: abuse_reports): z.infer<typeof AdminAbuseReport> {
	return AdminAbuseReport.parse({
		...row,
		reason: row.reason.toLowerCase(),
		weight: Number(row.weight),
		created_at: row.created_at.toISOString(),
	});
}

export function toModerationFlagDto(row: moderation_flags): z.infer<typeof ModerationFlag> {
	return ModerationFlag.parse({
		...row,
		details: row.details ?? {},
		created_at: row.created_at.toISOString(),
		resolved_at: row.resolved_at?.toISOString() ?? null,
	});
}

export default { toAdminAbuseReportDto, toModerationFlagDto };
