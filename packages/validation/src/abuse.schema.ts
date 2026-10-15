// C11 abuse reports and moderation flags.
import { IsoDateTime, limit, page, text, Uuid } from './common.schema.ts';
import { AbuseReason, AbuseStatus, AbuseTargetType, ModerationFlagKind, ModerationFlagTargetType } from './enums.ts';
import { z } from './zod.ts';

export const AbuseReportInput = z
	.object({ target_type: AbuseTargetType, target_id: Uuid, reason: AbuseReason, note: text(500).optional() })
	.openapi('AbuseReportInput');
export const AbuseReportResponse = z.object({ id: Uuid, duplicate: z.boolean() }).openapi('AbuseReportResponse');
export const AdminAbuseReport = z
	.object({
		id: Uuid,
		// Staff only: never returned to the reported user.
		reporter_id: Uuid,
		target_type: AbuseTargetType,
		target_id: Uuid,
		reason: AbuseReason,
		note: z.string().nullable(),
		weight: z.number(),
		status: AbuseStatus,
		created_at: IsoDateTime,
	})
	.openapi('AdminAbuseReport');
export const AdminAbuseReportQuery = z.object({
	status: AbuseStatus.optional(),
	target_type: AbuseTargetType.optional(),
	cursor: Uuid.optional(),
	limit: limit(50),
});
export const AdminAbuseReportList = page(AdminAbuseReport).openapi('AdminAbuseReportList');
export const ModerationFlag = z
	.object({
		id: Uuid,
		kind: ModerationFlagKind,
		target_type: ModerationFlagTargetType,
		target_id: Uuid,
		details: z.record(z.string(), z.unknown()),
		created_at: IsoDateTime,
		resolved_at: IsoDateTime.nullable(),
	})
	.openapi('ModerationFlag');
export const ModerationFlagQuery = z.object({ cursor: Uuid.optional(), limit: limit(50) });
export const ModerationFlagList = page(ModerationFlag).openapi('ModerationFlagList');
