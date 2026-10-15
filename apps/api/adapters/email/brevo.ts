import type { EmailAdapter } from './index.ts';

export function brevoEmail(apiKey: string, from: string): EmailAdapter {
	return {
		async send({ to, subject, html, text }) {
			const res = await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: { 'api-key': apiKey, 'content-type': 'application/json' },
				body: JSON.stringify({
					sender: { email: from },
					to: [{ email: to }],
					subject,
					htmlContent: html,
					textContent: text,
				}),
			});
			if (!res.ok) throw new Error(`brevo: HTTP ${res.status}`);
			return { id: ((await res.json()) as { messageId: string }).messageId };
		},
	};
}
