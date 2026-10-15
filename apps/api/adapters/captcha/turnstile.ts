import type { CaptchaAdapter } from './index.ts';

export function turnstileCaptcha(secret: string): CaptchaAdapter {
	return {
		async verify(token, ip) {
			const body = new URLSearchParams({ secret, response: token, ...(ip && { remoteip: ip }) });
			const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
				method: 'POST',
				body,
			});
			if (!res.ok) throw new Error(`turnstile: HTTP ${res.status}`);
			return ((await res.json()) as { success: boolean }).success === true;
		},
	};
}
