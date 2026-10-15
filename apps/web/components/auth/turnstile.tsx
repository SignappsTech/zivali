'use client';

import { useLocale } from 'next-intl';
import * as React from 'react';

import { ApiError } from '@zivali/api/client';

// Cloudflare Turnstile without an SDK (C7): the hosted Supabase project wants a captcha token on email sign-up,
// sign-in, reset and resend (CH-175). TASK-17.2 reuses this for anonymous sign-in and the /captcha page.

type Turnstile = {
	render: (element: HTMLElement, options: Record<string, unknown>) => string;
	execute: (widget: string) => void;
	reset: (widget: string) => void;
	remove: (widget: string) => void;
};
declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<Turnstile> | undefined;

/** Loads api.js once; the proxy's CSP allows it (and its iframe) only while a site key is set. */
function loadTurnstile(): Promise<Turnstile> {
	loading ??= new Promise<Turnstile>((resolve, reject) => {
		const script = document.createElement('script');
		script.src = SCRIPT;
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
		script.onerror = () => {
			loading = undefined;
			reject(new Error('turnstile'));
		};
		document.head.append(script);
	});
	return loading;
}

const captchaFailed = () => new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED');

/**
 * `widget` goes inside the form; `getToken()` runs a fresh challenge on each submit (a token is single-use). The
 * widget stays invisible unless Cloudflare needs a click, and it never takes focus on its own. Without
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY the captcha is off: no widget, no script, `getToken()` resolves undefined.
 */
export function useCaptcha() {
	const locale = useLocale();
	const widget = React.useRef<string | undefined>(undefined);
	const pending = React.useRef<{ resolve: (token: string) => void; reject: (error: ApiError) => void }>(undefined);
	// Read directly (inlined at build), not through lib/env, so the captcha does not ship zod.
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

	// A callback ref: the widget lives exactly as long as its element (a form view may unmount and come back).
	const mount = React.useCallback(
		(element: HTMLDivElement | null) => {
			if (!element || !siteKey) return;
			let turnstile: Turnstile | undefined;
			let id: string | undefined;
			let cancelled = false;
			loadTurnstile().then(
				(loaded) => {
					if (cancelled) return;
					turnstile = loaded;
					id = widget.current = loaded.render(element, {
						sitekey: siteKey,
						execution: 'execute',
						appearance: 'interaction-only',
						language: locale,
						callback: (token: string) => pending.current?.resolve(token),
						'error-callback': () => pending.current?.reject(captchaFailed()),
						'expired-callback': () => pending.current?.reject(captchaFailed()),
					});
				},
				() => undefined
			);
			return () => {
				cancelled = true;
				if (turnstile && id) turnstile.remove(id);
				if (widget.current === id) widget.current = undefined;
			};
		},
		[siteKey, locale]
	);

	const getToken = React.useCallback(async (): Promise<string | undefined> => {
		if (!siteKey) return undefined;
		const turnstile = await loadTurnstile().catch(() => undefined);
		const id = widget.current;
		if (!turnstile || !id) throw captchaFailed();
		return new Promise<string>((resolve, reject) => {
			pending.current = { resolve, reject };
			turnstile.reset(id);
			turnstile.execute(id);
		});
	}, [siteKey]);

	return { getToken, widget: siteKey ? <div ref={mount} className="empty:hidden" /> : null };
}
