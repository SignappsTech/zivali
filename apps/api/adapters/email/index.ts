// Transactional email (C10, C14 leads). Provider: EMAIL_PROVIDER mock | brevo (EU, ADR-010).
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { brevoEmail } from './brevo.ts';
import { mockEmail } from './mock.ts';

export type EmailMessage = {
	to: string;
	subject: string;
	html: string;
	text?: string;
	/** Extra headers, e.g. List-Unsubscribe on alert emails. */
	headers?: Record<string, string>;
};
export type EmailAdapter = { send(message: EmailMessage): Promise<{ id: string }>; sent?: EmailMessage[] };

export function createEmail(cfg: Config): EmailAdapter {
	const creds = !!(cfg.BREVO_API_KEY && cfg.EMAIL_FROM);
	const p = pickProvider('EMAIL_PROVIDER', cfg.EMAIL_PROVIDER, creds, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<EmailAdapter>('EMAIL_PROVIDER');
	return p === 'mock' ? mockEmail() : brevoEmail(cfg.BREVO_API_KEY!, cfg.EMAIL_FROM!);
}
