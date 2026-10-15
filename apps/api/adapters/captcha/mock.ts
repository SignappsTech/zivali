import type { CaptchaAdapter } from './index.ts';

// Passes any non-empty token except "fail".
export function mockCaptcha(): CaptchaAdapter {
	return { verify: async (token) => token !== '' && token !== 'fail' };
}
