// C11 abuse reports and moderation flags.
import type { IsoDateTime, Page, Uuid } from './common.ts';
import type { AbuseReason, AbuseStatus, AbuseTargetType, ModerationFlagKind } from './enums.ts';

export type AbuseReportInput = { target_type: AbuseTargetType; target_id: Uuid; reason: AbuseReason; note?: string };
/** 201 `duplicate: false`, or 200 `duplicate: true` when the caller already reported the target. */
export type AbuseReportResponse = { id: Uuid; duplicate: boolean };
export type AdminAbuseReport = {
	id: Uuid;
	target_type: AbuseTargetType;
	target_id: Uuid;
	reason: AbuseReason;
	note: string | null;
	weight: number;
	status: AbuseStatus;
	created_at: IsoDateTime;
};
export type AdminAbuseReportQuery = { status?: AbuseStatus; target_type?: AbuseTargetType; cursor?: string };
export type AdminAbuseReportList = Page<AdminAbuseReport>;
export type ModerationFlag = {
	id: Uuid;
	kind: ModerationFlagKind;
	target_type: AbuseTargetType;
	target_id: Uuid;
	details: Record<string, unknown>;
	created_at: IsoDateTime;
	resolved_at: IsoDateTime | null;
};
export type ModerationFlagList = Page<ModerationFlag>;
