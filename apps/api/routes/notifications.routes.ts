// /v1/notifications, /v1/notification-prefs and /v1/push-tokens (C10): the inbox, channel prefs and Expo push tokens
// of the signed-in user (anonymous finders and managers included), plus the signed one-click unsubscribe. Wiring only.
import { Router } from 'express';

import {
	CursorQuery,
	Uuid,
	MarkNotificationsReadInput,
	NotificationList,
	NotificationPref,
	NotificationPrefInput,
	NotificationPrefs,
	NotificationTypeParams,
	PushTokenDeleteInput,
	PushTokenInput,
	UnsubscribeQuery,
} from '@zivali/validation';

import NotificationsController from '../controllers/notifications.controller.ts';
import { apiRoutes } from '../lib/openapi.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { rateLimit } from '../middleware/rateLimit.middleware.ts';

const router = Router();
const route = apiRoutes(router, '/v1/notifications');

route(
	{
		method: 'get',
		path: '/',
		operationId: 'listNotifications',
		summary: 'Own inbox',
		description:
			'Newest first, keyset-paginated (`cursor` = the last item id, `limit` ≤ 50); `unread` counts all unread rows.',
		request: { query: CursorQuery.extend({ cursor: Uuid.optional() }) },
		responses: { 200: { description: 'One page of notifications', schema: NotificationList } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	NotificationsController.list
);

route(
	{
		method: 'post',
		path: '/read',
		operationId: 'markNotificationsRead',
		summary: 'Mark notifications read',
		description: '`{ ids }` (own rows; other ids are ignored) or `{ all: true }`.',
		request: { body: MarkNotificationsReadInput },
		responses: { 204: { description: 'Marked' } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('notifications.read', { limit: 300, window: 3600, key: 'user' }),
	NotificationsController.markRead
);

route(
	{
		method: 'get',
		path: '/unsubscribe',
		operationId: 'unsubscribeEmailPage',
		summary: 'Email unsubscribe confirmation page',
		description:
			'No sign-in. Verifies the signed token from an alert email and shows a confirm form (HTML, profile language); it writes nothing, so link scanners cannot turn alerts off.',
		request: { query: UnsubscribeQuery },
		responses: { 200: { description: 'HTML confirm page' } },
		errors: ['VALIDATION', 'NOT_FOUND'],
	},
	rateLimit('notifications.unsubscribe', { limit: 30, window: 3600, key: 'ip' }),
	NotificationsController.unsubscribePage
);

route(
	{
		method: 'post',
		path: '/unsubscribe',
		operationId: 'unsubscribeEmail',
		summary: 'One-click email unsubscribe',
		description:
			'No sign-in: the signed token (query) from an alert email turns that type email channel off (the confirm form, or an RFC 8058 `List-Unsubscribe=One-Click` POST; the body is ignored) and returns an HTML confirmation in the profile language.',
		request: { query: UnsubscribeQuery },
		responses: { 200: { description: 'HTML confirmation page' } },
		errors: ['VALIDATION', 'NOT_FOUND'],
	},
	rateLimit('notifications.unsubscribe', { limit: 30, window: 3600, key: 'ip' }),
	NotificationsController.unsubscribe
);

export const prefsRouter = Router();
const prefsRoute = apiRoutes(prefsRouter, '/v1/notification-prefs');

prefsRoute(
	{
		method: 'get',
		path: '/',
		operationId: 'getNotificationPrefs',
		summary: 'Own notification prefs',
		description:
			'One item per switchable type (defaults when never set; nearby_lost email is opt-in) plus the quiet hours (set with PATCH /v1/me).',
		responses: { 200: { description: 'Prefs and quiet hours', schema: NotificationPrefs } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	NotificationsController.getPrefs
);

prefsRoute(
	{
		method: 'put',
		path: '/:type',
		operationId: 'setNotificationPref',
		summary: 'Set the channels of one type',
		description:
			'Partial: omitted channels keep their value. manage_link and payment_receipt are transactional (VALIDATION).',
		request: { params: NotificationTypeParams, body: NotificationPrefInput },
		responses: { 200: { description: 'The pref', schema: NotificationPref } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('notifications.prefs', { limit: 120, window: 3600, key: 'user' }),
	NotificationsController.setPref
);

export const pushTokensRouter = Router();
const pushRoute = apiRoutes(pushTokensRouter, '/v1/push-tokens');

pushRoute(
	{
		method: 'post',
		path: '/',
		operationId: 'registerPushToken',
		summary: 'Register an Expo push token',
		description: 'Upsert by token: the token moves to the caller and `last_seen_at` is refreshed.',
		request: { body: PushTokenInput },
		responses: { 204: { description: 'Registered' } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('push_tokens.register', { limit: 60, window: 3600, key: 'user' }),
	NotificationsController.registerPushToken
);

pushRoute(
	{
		method: 'delete',
		path: '/',
		operationId: 'unregisterPushToken',
		summary: 'Remove an Expo push token',
		description: 'The token travels in the body, never in the URL. Only the caller’s own token is removed.',
		request: { body: PushTokenDeleteInput },
		responses: { 204: { description: 'Removed (or not the caller’s)' } },
		errors: ['UNAUTHENTICATED'],
	},
	authMiddleware,
	rateLimit('push_tokens.unregister', { limit: 60, window: 3600, key: 'user' }),
	NotificationsController.unregisterPushToken
);

export default router;
