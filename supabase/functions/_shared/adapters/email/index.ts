import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockEmail } from './mock.ts';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  readonly provider: string;
  send(message: EmailMessage): Promise<{ providerId: string }>;
}

/** EMAIL_PROVIDER = mock | brevo (BREVO_API_KEY). ADR-010. */
export function emailAdapter(get: Env = env): EmailAdapter {
  const provider = pickProvider('EMAIL_PROVIDER', { brevo: ['BREVO_API_KEY'] }, get);
  return provider === 'mock' ? mockEmail : notImplemented('EMAIL_PROVIDER', provider);
}
