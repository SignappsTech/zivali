// Forward types (M3 shelter portal, M4 entitlements). No contract or endpoint yet: shapes may change when the
// contracts are written; nothing in M2 sends or receives them.
import type { IsoDateTime, Uuid } from './common.ts';
import type {
	EntitlementKind,
	EntitlementStatus,
	IntakeBatchStatus,
	OrganisationKind,
	OrganisationMemberRole,
} from './enums.ts';

export type Organisation = {
	id: Uuid;
	kind: OrganisationKind;
	slug: string;
	name: string;
	region_id: number | null;
	verified_at: IsoDateTime | null;
	created_at: IsoDateTime;
};
export type OrganisationMember = {
	organisation_id: Uuid;
	user_id: Uuid;
	role: OrganisationMemberRole;
	created_at: IsoDateTime;
};
/** A batch of intake reports a shelter imports or files at once (reports with source 'organisation'). */
export type IntakeBatch = {
	id: Uuid;
	organisation_id: Uuid;
	status: IntakeBatchStatus;
	report_count: number;
	created_at: IsoDateTime;
	completed_at: IsoDateTime | null;
};
/** Owner entitlements (Premium, Podpornik) are keyed by user, Vet Partner by organisation (C13). */
export type Entitlement = {
	id: Uuid;
	kind: EntitlementKind;
	subject: { user_id: Uuid } | { organisation_id: Uuid };
	status: EntitlementStatus;
	payment_id: Uuid | null;
	starts_at: IsoDateTime;
	ends_at: IsoDateTime | null;
};
