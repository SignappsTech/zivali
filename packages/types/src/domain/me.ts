// C3 auth, profiles and roles: GET/PATCH /v1/me, admin users.
import type { IsoDateTime, LatLng, Page, Uuid } from './common.ts';
import type { Aal, Locale, UserRole } from './enums.ts';

/** Own profile, including private fields (home, phone, quiet hours). */
export type Profile = {
	id: Uuid;
	display_name: string | null;
	locale: Locale;
	role: UserRole;
	is_anonymous: boolean;
	home: LatLng | null;
	home_radius_km: number;
	phone: string | null;
	quiet_from: string | null;
	quiet_to: string | null;
	supporter_badge_visible: boolean;
};
/** GET /v1/me: the profile plus session facts. */
export type Me = Profile & { email: string | null; email_verified: boolean; aal: Aal };

export type UpdateMeInput = {
	display_name?: string | null;
	locale?: Locale;
	home?: LatLng | null;
	home_radius_km?: number;
	phone?: string | null;
	quiet_from?: string | null;
	quiet_to?: string | null;
	supporter_badge_visible?: boolean;
};

export type AdminUser = {
	id: Uuid;
	display_name: string | null;
	email: string | null;
	role: UserRole;
	is_anonymous: boolean;
	created_at: IsoDateTime;
};
export type AdminUserQuery = { query?: string; cursor?: string };
export type AdminUserList = Page<AdminUser>;
export type SetRoleInput = { role: UserRole };
export type SetRoleResponse = { id: Uuid; role: UserRole };
