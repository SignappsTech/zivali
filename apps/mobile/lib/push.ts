import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useSession } from '@zivali/api/auth';
import { useRegisterPushTokenMutation, useUnregisterPushTokenMutation } from '@zivali/api/notifications';
import type { PushTokenInput } from '@zivali/types';
import { toTargetPath } from '@/lib/deep-link';
import { env } from '@/lib/env';

/** The C10 token calls (`registerPushToken`, `unregisterPushToken`), unwrapped. */
export type PushApi = {
	register: (input: PushTokenInput) => Promise<unknown>;
	unregister: (input: { token: string }) => Promise<unknown>;
};

// In the foreground too, pushes and local proximity alerts show as a banner and in the list, without a sound.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

/** This device's token while a session has it registered, for the delete on sign-out. Memory only. */
let current: { token: string; api: PushApi } | undefined;

/**
 * `mock` provider (default until FCM/APNs credentials exist, Q-007) sends a placeholder token through the same path
 * without asking Expo. Registration failures never block the permission; the next start or sign-in registers again.
 */
async function registerToken(api: PushApi, provider: string): Promise<void> {
	const platform = Platform.OS === 'ios' ? 'ios' : 'android';
	try {
		const token =
			provider === 'mock'
				? `ExponentPushToken[mock-${platform}]`
				: (
						await Notifications.getExpoPushTokenAsync({
							projectId: Constants.expoConfig?.extra?.eas?.projectId,
						})
					).data;
		current = { token, api };
		await api.register({ token, platform });
	} catch (e) {
		// Offline or no backend yet. Never log the token.
		if (__DEV__) console.warn('push token registration failed', e);
	}
}

/**
 * The OS prompt for the notifications primer (`PermissionPrimer request`, shown first) and, when granted, the push
 * token handed to `registerPushToken` (C10). Denied: nothing is registered; the inbox and email still work.
 */
export async function requestPushPermission(api: PushApi, provider = env.EXPO_PUBLIC_PUSH_PROVIDER) {
	const { granted } = await Notifications.requestPermissionsAsync();
	if (granted) await registerToken(api, provider);
	return granted;
}

/** On start and sign-in: registers the token when the permission is already granted; never prompts. */
export async function registerIfGranted(api: PushApi, provider = env.EXPO_PUBLIC_PUSH_PROVIDER) {
	if ((await Notifications.getPermissionsAsync()).granted) await registerToken(api, provider);
}

/**
 * Sign-out, while the session still exists: deletes this device's token (C10 `DELETE /v1/push-tokens`), so the
 * next person on the device gets none of this account's pushes. Best effort: offline, the server drops the token
 * when Expo reports it gone, or the next sign-in moves it to the new account.
 */
export async function unregisterPush(): Promise<void> {
	const registered = current;
	current = undefined;
	await registered?.api.unregister({ token: registered.token }).catch(() => {});
}

function usePushApi(): PushApi {
	const [register] = useRegisterPushTokenMutation();
	const [unregister] = useUnregisterPushTokenMutation();
	return useMemo(
		() => ({ register: (input) => register(input).unwrap(), unregister: (input) => unregister(input).unwrap() }),
		[register, unregister]
	);
}

/** `request` for `<PermissionPrimer kind="notifications" request={request} />`. */
export function usePushPermission() {
	const api = usePushApi();
	return { request: () => requestPushPermission(api) };
}

/** `granted`, `ask` (the primer may still ask the OS) or `denied` (only system settings help); re-read on resume. */
export type PushStatus = 'granted' | 'ask' | 'denied';

export function usePushStatus(): [PushStatus | undefined, () => void] {
	const [status, setStatus] = useState<PushStatus>();
	const check = () =>
		void Notifications.getPermissionsAsync().then(
			({ granted, canAskAgain }) => setStatus(granted ? 'granted' : canAskAgain ? 'ask' : 'denied'),
			() => setStatus('denied')
		);
	useEffect(() => {
		check();
		const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
		return () => subscription.remove();
	}, []);
	return [status, check];
}

let handled: string | undefined;
function open(response: Notifications.NotificationResponse | null) {
	const request = response?.notification.request;
	const url = request?.content.data?.url;
	if (!request || handled === request.identifier || typeof url !== 'string') return;
	handled = request.identifier;
	router.push(toTargetPath(url) as Href);
}

/**
 * Mount once inside the store (root layout): registers this device's token for each signed-in session when the
 * permission is granted, and opens the target of a tapped push or local proximity alert, also when the tap launched
 * the app.
 */
export function usePushNotifications(): void {
	const { session } = useSession();
	const userId = session?.user.id;
	const api = usePushApi();

	useEffect(() => {
		if (userId) void registerIfGranted(api);
	}, [userId, api]);

	useEffect(() => {
		open(Notifications.getLastNotificationResponse());
		const subscription = Notifications.addNotificationResponseReceivedListener(open);
		return () => subscription.remove();
	}, []);
}
