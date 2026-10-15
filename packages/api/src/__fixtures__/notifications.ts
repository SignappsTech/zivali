// C10 examples (wire shape): inbox, prefs, nearby-alert subscription.
import type { AlertSubscription, Notification, NotificationList, NotificationPrefs } from '@zivali/types';

export const notification: Notification = {
	id: '5e1d0a2b-0000-4000-8000-000000000001',
	type: 'match_chip',
	payload: {
		match_id: '6a2c1b3d-0000-4000-8000-000000000001',
		lost_code: 'Pq7xK2mN',
		other_code: 'Hk3vT9qP',
		other_type: 'found',
		has_name: 'yes',
		pet_name: 'Piko',
		species: 'dog',
	},
	read_at: null,
	created_at: '2026-10-14T16:05:00Z',
};

export const notifications: NotificationList = { items: [notification], next_cursor: null, unread: 1 };

export const prefs: NotificationPrefs = {
	items: [
		{ type: 'chat_message', in_app: true, push: true, email: true },
		{ type: 'nearby_lost', in_app: true, push: true, email: false },
	],
	quiet_from: '22:00',
	quiet_to: '07:00',
};

export const alertSubscription: AlertSubscription = {
	center: { lat: 46.0512, lng: 14.5061 },
	radius_km: 5,
	species: ['dog', 'cat'],
	paused: false,
	daily_cap: 5,
	created_at: '2026-10-14T10:00:00Z',
	updated_at: '2026-10-14T10:00:00Z',
};
