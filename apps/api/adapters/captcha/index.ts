// Captcha verification for the leads form (C14). Provider: CAPTCHA_PROVIDER mock | turnstile.
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { mockCaptcha } from './mock.ts';
import { turnstileCaptcha } from './turnstile.ts';

export type CaptchaAdapter = { verify(token: string, ip?: string): Promise<boolean> };

export function createCaptcha(cfg: Config): CaptchaAdapter {
	const creds = !!cfg.TURNSTILE_SECRET_KEY;
	const p = pickProvider('CAPTCHA_PROVIDER', cfg.CAPTCHA_PROVIDER, creds, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<CaptchaAdapter>('CAPTCHA_PROVIDER');
	return p === 'mock' ? mockCaptcha() : turnstileCaptcha(cfg.TURNSTILE_SECRET_KEY!);
}
