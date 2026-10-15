import { Stack } from 'expo-router';

/**
 * P16 auth screens (C15 `auth/*`), one stack above the screen that asked for an account, which stays mounted with its
 * draft; close (useLeaveAuth) drops the whole stack and returns there.
 */
export default function AuthLayout() {
	return <Stack screenOptions={{ headerShown: false }} />;
}
