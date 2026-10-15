import type { AuthError } from '@supabase/supabase-js';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { z } from 'zod';

import { authError, signInWithApple, signInWithGoogle } from '@zivali/api/auth';
import type { Locale } from '@zivali/i18n/format';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Mobile auth (P16, C3) on top of @zivali/api/auth: the deep-link redirects, the native Google and Apple sign-in and
// the few Supabase Auth calls the shared client does not wrap yet. Errors are ApiError with C1 codes, as there.

/**
 * Confirmation and reset links come back to app/auth/callback (zivali://**, allow-listed in C3); GoTrue appends the
 * code to this query, and `type` tells the callback which link it was.
 */
export const authRedirect = (type: 'signup' | 'recovery') => `${Linking.createURL('/auth/callback')}?type=${type}`;

/** The Supabase minimum (supabase/config.toml minimum_password_length). */
export const MIN_PASSWORD = 8;
export const validEmail = (value: string) => z.email().safeParse(value).success;

async function check<R extends { error: AuthError | null }>(request: Promise<R>): Promise<R> {
	const result = await request;
	if (result.error) throw authError(result.error);
	return result;
}

/** The name waits in user_metadata until the first session saves it to the profile (lib/profile-i18n.tsx). */
export const signUp = ({
	name,
	email,
	password,
	locale,
}: {
	name: string;
	email: string;
	password: string;
	locale: Locale;
}) =>
	check(
		supabase.auth.signUp({
			email,
			password,
			options: { data: { locale, display_name: name }, emailRedirectTo: authRedirect('signup') },
		})
	);

export const resendConfirmation = (email: string) =>
	check(supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirect('signup') } }));

/** In memory only: set by a successful recovery-link exchange, so app/auth/new-password is not reachable by a plain session. */
let recovering = false;
export const isRecovering = () => recovering;

export const updatePassword = async (password: string) => {
	await check(supabase.auth.updateUser({ password }));
	recovering = false;
};

/** PKCE: the link's code becomes a session, on the device that asked for the link only (its verifier is here). */
export async function exchangeLinkCode(code: string, type?: string) {
	await check(supabase.auth.exchangeCodeForSession(code));
	recovering = type === 'recovery';
}

/** Google needs its web client id (and the iOS one on iOS); Apple is iOS only and flagged off until its account exists. */
export const providers = {
	google: Boolean(
		env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && (Platform.OS !== 'ios' || env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
	),
	apple: Platform.OS === 'ios' && env.EXPO_PUBLIC_APPLE_SIGN_IN,
};

/**
 * Native sign-in, then signInWithIdToken. The SDKs are required only here (not imported): a build without their native
 * module (Expo Go, an older dev build) never loads them while the buttons are hidden. Resolves 'cancelled' when the user backs out.
 */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<'ok' | 'cancelled'> {
	if (provider === 'google') {
		type GoogleSdk = typeof import('@react-native-google-signin/google-signin');
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see above)
		const { GoogleSignin } = require('@react-native-google-signin/google-signin') as GoogleSdk;
		GoogleSignin.configure({
			webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
			iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
		});
		await GoogleSignin.hasPlayServices();
		const response = await GoogleSignin.signIn();
		if (response.type === 'cancelled' || !response.data.idToken) return 'cancelled';
		await signInWithGoogle({ idToken: response.data.idToken });
		return 'ok';
	}
	// eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see above)
	const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
	// Apple gets the SHA-256 of the nonce, Supabase the nonce itself, and checks one against the other.
	const nonce = randomUUID();
	try {
		const credential = await Apple.signInAsync({
			requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
			nonce: await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce),
		});
		if (!credential.identityToken) return 'cancelled';
		await signInWithApple({ idToken: credential.identityToken, nonce });
		// Apple sends the name on the first sign-in only, and not inside the ID token.
		const { givenName, familyName } = credential.fullName ?? {};
		const fullName = [givenName, familyName].filter(Boolean).join(' ');
		if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
		return 'ok';
	} catch (error) {
		if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'cancelled';
		throw error;
	}
}

/** Sign-out must also drop the Google account, or the next person on a shared Android device signs in as this user. */
export async function signOutProviders() {
	try {
		type GoogleSdk = typeof import('@react-native-google-signin/google-signin');
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see signInWithProvider)
		const { GoogleSignin } = require('@react-native-google-signin/google-signin') as GoogleSdk;
		await GoogleSignin.signOut();
	} catch {
		// No native module (Expo Go) or not signed in with Google: nothing to clear.
	}
}

/** "Odpri e-pošto": the Mail app on iOS; Android has no inbox URL, so the mail app opens on a new message. */
export const openMailApp = () => Linking.openURL(Platform.OS === 'ios' ? 'message:' : 'mailto:');
