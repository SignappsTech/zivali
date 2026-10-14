import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockCaptcha } from './mock.ts';

export interface CaptchaAdapter {
  readonly provider: string;
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

/** CAPTCHA_PROVIDER = mock | turnstile (TURNSTILE_SECRET_KEY). ADR-005. */
export function captchaAdapter(get: Env = env): CaptchaAdapter {
  const provider = pickProvider('CAPTCHA_PROVIDER', { turnstile: ['TURNSTILE_SECRET_KEY'] }, get);
  return provider === 'mock' ? mockCaptcha : notImplemented('CAPTCHA_PROVIDER', provider);
}
