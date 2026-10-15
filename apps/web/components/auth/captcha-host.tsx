'use client';

import * as React from 'react';

import { useCaptcha } from './turnstile';

declare global {
	interface Window {
		/** react-native-webview's bridge, present only inside the app's WebView. */
		ReactNativeWebView?: { postMessage: (message: string) => void };
	}
}

/**
 * The /captcha page's widget for the mobile WebView (C7, C15): one challenge on load, then the result is posted to
 * the app as JSON: `{ type: 'captcha', token }` (`token: null` while the captcha is off) or `{ type: 'captcha_error' }`.
 * The widget shows only when Cloudflare needs a click; the app reloads the page to try again.
 */
export function CaptchaHost() {
	const { getToken, widget } = useCaptcha();

	React.useEffect(() => {
		const post = (message: object) => window.ReactNativeWebView?.postMessage(JSON.stringify(message));
		getToken().then(
			(token) => post({ type: 'captcha', token: token ?? null }),
			() => post({ type: 'captcha_error' })
		);
	}, [getToken]);

	return <div className="mt-6">{widget}</div>;
}
