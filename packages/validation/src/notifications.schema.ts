// C10 notifications (inbox, prefs, push tokens) and nearby alerts.
import { IsoDateTime, LatLng, page, Uuid } from './common.schema.ts';
import { NotificationType, PushPlatform, Species } from './enums.ts';
import { z } from './zod.ts';

export const Notification = z
	.object({
		id: Uuid,
		type: NotificationType,
		payload: z.record(z.string(), z.unknown()),
		read_at: IsoDateTime.nullable(),
		created_at: IsoDateTime,
	})
	.openapi('Notification');
export const NotificationList = page(Notification)
	.extend({ unread: z.number().int().min(0) })
	.openapi('NotificationList');
export const MarkNotificationsReadInput = z
	.union([z.object({ ids: z.array(Uuid).min(1).max(100) }), z.object({ all: z.literal(true) })])
	.openapi('MarkNotificationsReadInput');
export const NotificationPref = z
	.object({ type: NotificationType, in_app: z.boolean(), push: z.boolean(), email: z.boolean() })
	.openapi('NotificationPref');
export const NotificationPrefs = z
	.object({ items: z.array(NotificationPref), quiet_from: z.string().nullable(), quiet_to: z.string().nullable() })
	.openapi('NotificationPrefs');
export const NotificationTypeParams = z.object({ type: NotificationType });
export const NotificationPrefInput = z
	.object({ in_app: z.boolean().optional(), push: z.boolean().optional(), email: z.boolean().optional() })
	.openapi('NotificationPrefInput');
export const PushTokenInput = z
	.object({ token: z.string().min(1).max(512), platform: PushPlatform })
	.openapi('PushTokenInput');
export const PushTokenParams = z.object({ token: z.string().min(1).max(512) });
export const UnsubscribeQuery = z.object({ token: z.string().min(1).max(1024) });

export const AlertSubscriptionInput = z
	.object({
		center: LatLng,
		radius_km: z.number().int().min(1).max(25),
		species: z.array(Species).min(1).max(2),
		paused: z.boolean(),
	})
	.openapi('AlertSubscriptionInput');
export const AlertSubscription = AlertSubscriptionInput.extend({
	daily_cap: z.number().int(),
	created_at: IsoDateTime,
	updated_at: IsoDateTime,
}).openapi('AlertSubscription');
