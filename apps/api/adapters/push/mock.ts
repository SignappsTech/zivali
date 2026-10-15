import type { PushAdapter, PushMessage, PushResult } from './index.ts';

// Tokens containing "unregistered" simulate DeviceNotRegistered.
export function mockPush(): PushAdapter {
	const sent: PushMessage[] = [];
	return {
		sent,
		async send(messages) {
			sent.push(...messages);
			return messages.map((m): PushResult =>
				m.to.includes('unregistered') ? { status: 'error', error: 'DeviceNotRegistered' } : { status: 'ok' }
			);
		},
	};
}
