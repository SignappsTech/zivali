import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useRegisterPushTokenMutation } from '@zivali/api/notifications';
import type { PushTokenInput } from '@zivali/types';
import { env } from '@/lib/env';

type Register = (input: PushTokenInput) => Promise<unknown>;

/**
 * The OS prompt for the notifications primer (`PermissionPrimer request`, shown first) and, when granted, the push
 * token handed to `registerPushToken` (C10). `mock` provider (default until FCM/APNs credentials exist, Q-007) sends a
 * placeholder token through the same path without asking Expo. Registration failures never block the permission.
 */
export async function requestPushPermission(register: Register, provider = env.EXPO_PUBLIC_PUSH_PROVIDER) {
	const { granted } = await Notifications.requestPermissionsAsync();
	if (!granted) return false;
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
		await register({ token, platform });
	} catch (e) {
		// Offline or no backend yet: the token is registered again on the next request. Never log the token.
		if (__DEV__) console.warn('push token registration failed', e);
	}
	return true;
}

/** `request` for `<PermissionPrimer kind="notifications" request={request} />` (TASK-22.5 mounts it). */
export function usePushPermission() {
	const [register] = useRegisterPushTokenMutation();
	return { request: () => requestPushPermission((input) => register(input).unwrap()) };
}
