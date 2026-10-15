import type { EmailAdapter } from './index.ts';

export function brevoEmail(apiKey: string, from: string): EmailAdapter {
	return {
		async send({ to, subject, html, text, headers }) {
			const res = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: { 'api-key': apiKey, 'content-type': 'application/json' },
				body: JSON.stringify({
					// Sender name per the content slice; EMAIL_FROM is a monitored mailbox, so replies reach support.
					sender: { name: 'Najdimo', email: from },
					to: [{ email: to }],
					subject,
					htmlContent: html,
					textContent: text,
					headers,
				}),
			});
			if (!res.ok) throw new Error(`brevo: HTTP ${res.status}`);
			return { id: ((await res.json()) as { messageId: string }).messageId };
		},
	};
}
