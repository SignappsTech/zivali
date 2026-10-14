import { createLogger } from '../../log.ts';
import type { EmailAdapter } from './index.ts';

/** Offline: sends nothing, logs without the address or content. */
export const mockEmail: EmailAdapter = {
  provider: 'mock',
  send() {
    createLogger({ fn: 'adapters' }).info('email mocked');
    return Promise.resolve({ providerId: `mock-${crypto.randomUUID()}` });
  },
};
