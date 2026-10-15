import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const mockKeychain = new Map<string, string>();
const mockSqlite = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
	WHEN_UNLOCKED_THIS_DEVICE_ONLY: 5,
	getItemAsync: jest.fn(async (name: string) => mockKeychain.get(name) ?? null),
	setItemAsync: jest.fn(async (name: string, value: string) => void mockKeychain.set(name, value)),
	deleteItemAsync: jest.fn(async (name: string) => void mockKeychain.delete(name)),
}));
jest.mock('expo-sqlite/localStorage/install', () => {
	globalThis.localStorage = {
		getItem: (name: string) => mockSqlite.get(name) ?? null,
		setItem: (name: string, value: string) => void mockSqlite.set(name, value),
		removeItem: (name: string) => void mockSqlite.delete(name),
	} as Storage;
	return {};
});
// Real AES-GCM: the web build of expo-crypto (SubtleCrypto) stands in for the native module.
jest.mock('expo-crypto/build/aes/ExpoCryptoAES', () => jest.requireActual('expo-crypto/build/aes/ExpoCryptoAES.web'));
jest.mock('@supabase/supabase-js', () => ({
	...jest.requireActual('@supabase/supabase-js'),
	createClient: jest.fn(() => ({ auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() } })),
}));

// lib/env parses process.env when it loads, so the variables are set first.
Object.assign(process.env, {
	EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
	EXPO_PUBLIC_APP_URL: 'http://localhost:3000',
	EXPO_PUBLIC_API_URL: 'http://localhost:4000',
	EXPO_PUBLIC_APP_ENV: 'local',
});
const { encryptedStorage } = jest.requireActual<typeof import('@/lib/supabase')>('@/lib/supabase');

const name = 'sb-127-auth-token';
const session = JSON.stringify({ access_token: 'eyJhbGciOi.secret', user: { user_metadata: { name: 'Primož' } } });

beforeEach(() => {
	mockKeychain.clear();
	mockSqlite.clear();
});

test('creates the client with PKCE, the process lock and the encrypted storage', () => {
	expect(createClient).toHaveBeenCalledWith(
		'http://127.0.0.1:54321',
		'sb_publishable_test',
		expect.objectContaining({
			auth: expect.objectContaining({ flowType: 'pkce', lock: processLock, storage: encryptedStorage }),
		})
	);
});

test('stores only ciphertext in SQLite and the AES-256 key in the keychain, this device only', async () => {
	await encryptedStorage.setItem(name, session);

	expect(mockSqlite.get(name)).not.toContain('access_token');
	expect(mockKeychain.get(name)).toMatch(/^[0-9a-f]{64}$/);
	expect(SecureStore.setItemAsync).toHaveBeenCalledWith(name, expect.any(String), {
		keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
	});
	await expect(encryptedStorage.getItem(name)).resolves.toBe(session);
});

test('uses a fresh key and nonce on every write', async () => {
	await encryptedStorage.setItem(name, session);
	const [key, sealed] = [mockKeychain.get(name), mockSqlite.get(name)];
	await encryptedStorage.setItem(name, session);

	expect(mockKeychain.get(name)).not.toBe(key);
	expect(mockSqlite.get(name)).not.toBe(sealed);
});

test('returns null when nothing is stored', async () => {
	await expect(encryptedStorage.getItem(name)).resolves.toBeNull();
});

test('returns null instead of throwing when the key is lost or wrong, or the ciphertext was changed', async () => {
	await encryptedStorage.setItem(name, session);
	const [key, sealed] = [mockKeychain.get(name)!, mockSqlite.get(name)!];

	mockKeychain.delete(name);
	await expect(encryptedStorage.getItem(name)).resolves.toBeNull();

	mockKeychain.set(name, 'ab'.repeat(32));
	await expect(encryptedStorage.getItem(name)).resolves.toBeNull();

	mockKeychain.set(name, key);
	mockSqlite.set(name, sealed.slice(0, 20) + (sealed[20] === 'A' ? 'B' : 'A') + sealed.slice(21));
	await expect(encryptedStorage.getItem(name)).resolves.toBeNull();
});

test('removes both the ciphertext and the key', async () => {
	await encryptedStorage.setItem(name, session);
	await encryptedStorage.removeItem(name);

	expect(mockSqlite.has(name)).toBe(false);
	expect(mockKeychain.has(name)).toBe(false);
});
