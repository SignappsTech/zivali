// Push notifications (C10). Provider: PUSH_PROVIDER mock | expo. `DeviceNotRegistered` tells the caller to drop the token.
import type { Config } from '../../lib/config.ts';
import { pickProvider } from '../select.ts';
import { expoPush } from './expo.ts';
import { mockPush } from './mock.ts';

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown> };
export type PushResult = { status: 'ok' } | { status: 'error'; error: 'DeviceNotRegistered' | 'Other' };
export type PushAdapter = { send(messages: PushMessage[]): Promise<PushResult[]>; sent?: PushMessage[] };

export function createPush(cfg: Config): PushAdapter {
	// The Expo push API works without a token unless enhanced security is on, so selecting expo is enough.
	const p = pickProvider(
		'PUSH_PROVIDER',
		cfg.PUSH_PROVIDER,
		cfg.PUSH_PROVIDER === 'expo',
		cfg.NODE_ENV === 'production'
	);
	return p === 'mock' ? mockPush() : expoPush(cfg.EXPO_ACCESS_TOKEN);
}
