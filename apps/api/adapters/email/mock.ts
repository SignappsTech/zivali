import type { EmailAdapter, EmailMessage } from './index.ts';

// Records messages in `sent` so tests can assert on them.
export function mockEmail(): EmailAdapter {
	const sent: EmailMessage[] = [];
	return {
		sent,
		async send(message) {
			sent.push(message);
			return { id: `mock-${sent.length}` };
		},
	};
}
