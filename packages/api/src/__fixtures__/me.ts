// C3 examples (GET /v1/me); fields the example leaves out have their defaults.
import type { AdminUserList, AuditLogList, Me } from '@zivali/types';

export const me: Me = {
	id: '1b9c6f4e-2d1a-4c8e-9f3b-5a7d2e8c1f00',
	display_name: 'Ana',
	locale: 'sl',
	role: 'USER',
	email: 'ana@example.si',
	email_verified: true,
	is_anonymous: false,
	aal: 'aal1',
	home: { lat: 46.06, lng: 14.51 },
	home_radius_km: 5,
	phone: null,
	quiet_from: null,
	quiet_to: null,
	supporter_badge_visible: true,
};

export const anonymousMe: Me = {
	...me,
	display_name: null,
	email: null,
	email_verified: false,
	is_anonymous: true,
	home: null,
};

export const adminMe: Me = { ...me, role: 'ADMIN', aal: 'aal2' };

export const adminUsers: AdminUserList = {
	items: [
		{
			id: me.id,
			display_name: 'Ana',
			email_masked: 'a***@example.si',
			role: 'USER',
			is_anonymous: false,
			created_at: '2026-10-01T08:00:00Z',
		},
	],
	next_cursor: null,
};

/** GET /v1/admin/audit-log, newest first: a role change with its note, a list view, and a system action. */
export const auditLog: AuditLogList = {
	items: [
		{
			id: '7f3c1a2e-9b4d-4e6f-8a1c-2d3e4f5a6b70',
			actor_id: '0c4e2b1a-6d8f-4a3c-9e5b-7f1a2c3d4e50',
			action: 'user.role.set',
			target_type: 'profile',
			target_id: me.id,
			diff: { from: 'USER', to: 'MODERATOR', note: 'Shelter coordinator' },
			created_at: '2026-10-15T12:32:00Z',
		},
		{
			id: '6e2b0f1d-8a3c-4d5e-9f0b-1c2d3e4f5a60',
			actor_id: '0c4e2b1a-6d8f-4a3c-9e5b-7f1a2c3d4e50',
			action: 'admin.users.list',
			target_type: 'profile',
			target_id: null,
			diff: null,
			created_at: '2026-10-15T11:05:00Z',
		},
		{
			id: '5d1a9e0c-7f2b-4c4d-8e9a-0b1c2d3e4f50',
			actor_id: null,
			action: 'report.hide',
			target_type: 'report',
			target_id: 'Hk3vT9qP',
			diff: { reason: 'expired' },
			created_at: '2026-10-14T07:40:00Z',
		},
	],
	next_cursor: null,
};
