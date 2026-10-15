import 'expo-sqlite/localStorage/install';

import { createClient, processLock } from '@supabase/supabase-js';
import { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { env } from '@/lib/env';

// Supabase's LargeSecureStore pattern: a session is too large for the keychain, so it is AES-256-GCM encrypted into
// SQLite localStorage and only its random key, fresh on every write, lives in the keychain/keystore.
const keyOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const encryptedStorage = {
	async getItem(name: string): Promise<string | null> {
		const sealed = localStorage.getItem(name);
		if (sealed === null) return null;
		try {
			const hex = await SecureStore.getItemAsync(name, keyOptions);
			if (!hex) return null;
			const key = await AESEncryptionKey.import(hex, 'hex');
			return new TextDecoder().decode(await aesDecryptAsync(AESSealedData.fromCombined(sealed), key));
		} catch {
			// Lost key or tampered ciphertext: no session, so the user signs in again.
			return null;
		}
	},
	async setItem(name: string, value: string): Promise<void> {
		const key = await AESEncryptionKey.generate(AESKeySize.AES256);
		const sealed = await aesEncryptAsync(new TextEncoder().encode(value), key);
		await SecureStore.setItemAsync(name, await key.encoded('hex'), keyOptions);
		localStorage.setItem(name, await sealed.combined('base64'));
	},
	async removeItem(name: string): Promise<void> {
		localStorage.removeItem(name);
		await SecureStore.deleteItemAsync(name, keyOptions);
	},
};

// Auth session and Realtime only; data goes through the REST API (@zivali/api).
export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		storage: encryptedStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
		flowType: 'pkce',
		lock: processLock,
	},
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
	if (state === 'active') supabase.auth.startAutoRefresh();
	else supabase.auth.stopAutoRefresh();
});
