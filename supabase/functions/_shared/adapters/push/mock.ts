import { createLogger } from '../../log.ts';
import type { PushAdapter } from './index.ts';

/** Offline: every message succeeds; logs the count only. */
export const mockPush: PushAdapter = {
  provider: 'mock',
  send(messages) {
    createLogger({ fn: 'adapters' }).info('push mocked', { count: messages.length });
    return Promise.resolve(messages.map(({ to }) => ({ to, ok: true })));
  },
};
