import type { CaptchaAdapter } from './index.ts';

/** Accepts any non-empty token except `fail`, so tests can drive CAPTCHA_FAILED offline. */
export const mockCaptcha: CaptchaAdapter = {
  provider: 'mock',
  verify: (token) => Promise.resolve(token !== '' && token !== 'fail'),
};
