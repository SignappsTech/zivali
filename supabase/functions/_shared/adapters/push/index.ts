import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockPush } from './mock.ts';

export interface PushMessage {
  /** Expo push token */
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/** One result per message; `error: 'DeviceNotRegistered'` means the token must be deleted (ADR-010). */
export interface PushResult {
  to: string;
  ok: boolean;
  error?: string;
}

export interface PushAdapter {
  readonly provider: string;
  send(messages: PushMessage[]): Promise<PushResult[]>;
}

/** PUSH_PROVIDER = mock | expo (EXPO_ACCESS_TOKEN). ADR-010. */
export function pushAdapter(get: Env = env): PushAdapter {
  const provider = pickProvider('PUSH_PROVIDER', { expo: ['EXPO_ACCESS_TOKEN'] }, get);
  return provider === 'mock' ? mockPush : notImplemented('PUSH_PROVIDER', provider);
}
