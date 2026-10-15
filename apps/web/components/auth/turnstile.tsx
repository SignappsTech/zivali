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
	const element = React.useRef<HTMLDivElement | null>(null);
	const widget = React.useRef<{ turnstile: Turnstile; id: string } | undefined>(undefined);
	const pending = React.useRef<{ resolve: (token: string) => void; reject: (error: ApiError) => void }>(undefined);
	// Read directly: NEXT_PUBLIC_* is inlined at build.
	const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

	// One render for the mount and for a getToken() that finds no widget (api.js failed to load at mount).
	const render = React.useCallback(
		(target: HTMLElement, turnstile: Turnstile) => {
			const fail = () => pending.current?.reject(captchaFailed());
			const id = turnstile.render(target, {
				sitekey: siteKey,
				execution: 'execute',
				appearance: 'interaction-only',
				language: locale,
				callback: (token: string) => pending.current?.resolve(token),
				'error-callback': fail,
				'expired-callback': fail,
				// An interactive challenge left unsolved: settle, so the caller can retry.
				'timeout-callback': fail,
			});
			widget.current = { turnstile, id };
		},
		[siteKey, locale]
	);

	// A callback ref: the widget lives exactly as long as its element (a form view may unmount and come back).
	const mount = React.useCallback(
		(node: HTMLDivElement | null) => {
			if (!node || !siteKey) return;
			element.current = node;
			let cancelled = false;
			loadTurnstile().then(
				(loaded) => {
					if (!cancelled && !widget.current) render(node, loaded);
				},
				// Offline or a Cloudflare outage: getToken() loads and renders it on the next attempt.
				() => undefined
			);
			return () => {
				cancelled = true;
				if (element.current === node) element.current = null;
				widget.current?.turnstile.remove(widget.current.id);
				widget.current = undefined;
			};
		},
		[siteKey, render]
	);

	const getToken = React.useCallback(async (): Promise<string | undefined> => {
		if (!siteKey) return undefined;
		const turnstile = await loadTurnstile().catch(() => undefined);
		if (turnstile && !widget.current && element.current) render(element.current, turnstile);
		const current = widget.current;
		if (!turnstile || !current) throw captchaFailed();
		// A challenge still open from an earlier call is settled first, so no caller waits forever.
		pending.current?.reject(captchaFailed());
		return new Promise<string>((resolve, reject) => {
			pending.current = { resolve, reject };
			current.turnstile.reset(current.id);
			current.turnstile.execute(current.id);
		});
	}, [siteKey, render]);

	return { getToken, widget: siteKey ? <div ref={mount} className="empty:hidden" /> : null };
}
