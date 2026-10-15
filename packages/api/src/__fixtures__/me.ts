// C3 examples (GET /v1/me); fields the example leaves out have their defaults.
import type { AdminUserList, Me } from '@zivali/types';

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
			email: 'a***@example.si',
			role: 'USER',
			is_anonymous: false,
			created_at: '2026-10-01T08:00:00Z',
		},
	],
	next_cursor: null,
};
