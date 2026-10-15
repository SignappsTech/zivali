// C3 profiles and roles: GET/PATCH /v1/me, GET /v1/admin/users, PUT /v1/admin/users/:id/role.
import { ClockTime, Cursor, IsoDateTime, LatLng, nullOr, page, text, Uuid } from './common.schema.ts';
import { Aal, Locale, UserRole } from './enums.ts';
import { z } from './zod.ts';

export const Profile = z
	.object({
		id: Uuid,
		display_name: z.string().nullable(),
		locale: Locale,
		role: UserRole,
		is_anonymous: z.boolean(),
		home: nullOr(LatLng),
		home_radius_km: z.number().int(),
		phone: z.string().nullable(),
		quiet_from: z.string().nullable(),
		quiet_to: z.string().nullable(),
		supporter_badge_visible: z.boolean(),
	})
	.openapi('Profile', { description: 'Own profile, including private fields.' });
export const Me = Profile.extend({ email: z.string().nullable(), email_verified: z.boolean(), aal: Aal }).openapi('Me');

export const UpdateMeInput = z
	.object({
		display_name: text(60).nullable().optional(),
		locale: Locale.optional(),
		home: nullOr(LatLng).optional(),
		home_radius_km: z.number().int().min(1).max(25).optional(),
		phone: z
			.string()
			.trim()
			.regex(/^\+?[\d ()/-]{6,20}$/, 'Invalid phone number')
			.nullable()
			.optional(),
		quiet_from: ClockTime.nullable().optional(),
		quiet_to: ClockTime.nullable().optional(),
		supporter_badge_visible: z.boolean().optional(),
	})
	.openapi('UpdateMeInput');

export const AdminUser = z
	.object({
		id: Uuid,
		display_name: z.string().nullable(),
		email: z.string().nullable(),
		role: UserRole,
		is_anonymous: z.boolean(),
		created_at: IsoDateTime,
	})
	.openapi('AdminUser');
export const AdminUserQuery = z.object({ query: z.string().trim().max(100).optional(), cursor: Cursor.optional() });
export const AdminUserList = page(AdminUser).openapi('AdminUserList');
export const SetRoleInput = z.object({ role: UserRole }).openapi('SetRoleInput');
export const SetRoleResponse = z.object({ id: Uuid, role: UserRole }).openapi('SetRoleResponse');
