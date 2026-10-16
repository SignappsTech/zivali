import { act, cleanup, render, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.resetModules();
	delete window.turnstile;
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
	<NextIntlClientProvider locale="en" messages={{}}>
		{children}
	</NextIntlClientProvider>
);

describe('useCaptcha', () => {
	it('is off without a site key: no widget, no script, no token', async () => {
		const { useCaptcha } = await import('./turnstile');
		const { result } = renderHook(() => useCaptcha(), { wrapper });
		expect(result.current.widget).toBeNull();
		expect(await result.current.getToken()).toBeUndefined();
		expect(document.querySelector('script[src*="turnstile"]')).toBeNull();
	});

	it('loads Turnstile once, runs a fresh challenge per submit and removes the widget with its form', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
		let options: Record<string, (value?: string) => void> = {};
		const turnstile = {
			render: vi.fn(
				(_element: HTMLElement, given: Record<string, unknown>) => ((options = given as typeof options), 'w1')
			),
			reset: vi.fn(),
			execute: vi.fn(),
			remove: vi.fn(),
		};
		// The script "loads": Turnstile is there and onload fires.
		const append = vi.spyOn(document.head, 'append').mockImplementation((script) => {
			window.turnstile = turnstile;
			(script as HTMLScriptElement).onload?.(new Event('load'));
		});
		const { useCaptcha } = await import('./turnstile');
		let captcha!: ReturnType<typeof useCaptcha>;
		function Form() {
			captcha = useCaptcha();
			return <form>{captcha.widget}</form>;
		}
		const { unmount } = render(<Form />, { wrapper });
		await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalledOnce());
		expect(turnstile.render.mock.calls[0]![1]).toMatchObject({
			sitekey: '1x00000000000000000000AA',
			execution: 'execute',
			appearance: 'interaction-only',
			language: 'en',
		});

		const token = captcha.getToken();
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith('w1'));
		expect(turnstile.reset).toHaveBeenCalledWith('w1');
		act(() => options.callback!('token-1'));
		expect(await token).toBe('token-1');

		const failed = captcha.getToken();
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledTimes(2));
		act(() => options['error-callback']!());
		await expect(failed).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
		// An expired token and an interactive challenge left unsolved settle too, so a retry can run.
		for (const [n, event] of [
			[3, 'expired-callback'],
			[4, 'timeout-callback'],
		] as const) {
			const attempt = captcha.getToken();
			await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledTimes(n));
			act(() => options[event]!());
			await expect(attempt).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
		}
		expect(append).toHaveBeenCalledOnce();
		// The widget goes with its form.
		unmount();
		expect(turnstile.remove).toHaveBeenCalledWith('w1');
	});
});

describe('useCaptcha after a failed api.js load', () => {
	it('loads and renders the widget on the next getToken(), then yields a token', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
		let options: Record<string, (value?: string) => void> = {};
		const turnstile = {
			render: vi.fn(
				(_element: HTMLElement, given: Record<string, unknown>) => ((options = given as typeof options), 'w1')
			),
			reset: vi.fn(),
			execute: vi.fn(),
			remove: vi.fn(),
		};
		// Offline at mount (the error event comes later, as in a browser), then the script loads.
		const append = vi
			.spyOn(document.head, 'append')
			.mockImplementationOnce((script) => {
				setTimeout(() => (script as HTMLScriptElement).onerror?.(new Event('error')));
			})
			.mockImplementation((script) => {
				window.turnstile = turnstile;
				(script as HTMLScriptElement).onload?.(new Event('load'));
			});
		const { useCaptcha } = await import('./turnstile');
		let captcha!: ReturnType<typeof useCaptcha>;
		function Form() {
			captcha = useCaptcha();
			return <form>{captcha.widget}</form>;
		}
		render(<Form />, { wrapper });
		await vi.waitFor(() => expect(append).toHaveBeenCalledOnce());
		// Let the error event fire: no widget.
		await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
		expect(turnstile.render).not.toHaveBeenCalled();

		const token = captcha.getToken();
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith('w1'));
		expect(append).toHaveBeenCalledTimes(2);
		expect(turnstile.render.mock.calls[0]![0]).toBeInstanceOf(HTMLDivElement);
		act(() => options.callback!('token-2'));
		expect(await token).toBe('token-2');
	});
});

describe('useCaptcha({ lazy: true })', () => {
	it('loads nothing on mount; the first getToken() loads, renders and runs the widget', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
		let options: Record<string, (value?: string) => void> = {};
		const turnstile = {
			render: vi.fn(
				(_element: HTMLElement, given: Record<string, unknown>) => ((options = given as typeof options), 'w1')
			),
			reset: vi.fn(),
			execute: vi.fn(),
			remove: vi.fn(),
		};
		const append = vi.spyOn(document.head, 'append').mockImplementation((script) => {
			window.turnstile = turnstile;
			(script as HTMLScriptElement).onload?.(new Event('load'));
		});
		const { useCaptcha } = await import('./turnstile');
		let captcha!: ReturnType<typeof useCaptcha>;
		function Form() {
			captcha = useCaptcha({ lazy: true });
			return <form>{captcha.widget}</form>;
		}
		const { unmount } = render(<Form />, { wrapper });
		await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
		expect(append).not.toHaveBeenCalled();

		const token = captcha.getToken();
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith('w1'));
		expect(append).toHaveBeenCalledOnce();
		expect(turnstile.render.mock.calls[0]![0]).toBeInstanceOf(HTMLDivElement);
		act(() => options.callback!('token-3'));
		expect(await token).toBe('token-3');
		unmount();
		expect(turnstile.remove).toHaveBeenCalledWith('w1');
	});
});

describe('CaptchaHost (/captcha for the mobile WebView)', () => {
	const postMessage = vi.fn();
	const posted = () => postMessage.mock.calls.map(([message]) => JSON.parse(message as string));
	afterEach(() => {
		postMessage.mockClear();
		delete window.ReactNativeWebView;
	});

	it('posts a null token while the captcha is off', async () => {
		window.ReactNativeWebView = { postMessage };
		const { CaptchaHost } = await import('./captcha-host');
		render(<CaptchaHost />, { wrapper });
		await vi.waitFor(() => expect(posted()).toEqual([{ type: 'captcha', token: null }]));
	});

	it('runs one challenge on load and posts its token, or the failure', async () => {
		vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
		window.ReactNativeWebView = { postMessage };
		let options: Record<string, (value?: string) => void> = {};
		const turnstile = {
			render: vi.fn(
				(_element: HTMLElement, given: Record<string, unknown>) => ((options = given as typeof options), 'w1')
			),
			reset: vi.fn(),
			execute: vi.fn(),
			remove: vi.fn(),
		};
		vi.spyOn(document.head, 'append').mockImplementation((script) => {
			window.turnstile = turnstile;
			(script as HTMLScriptElement).onload?.(new Event('load'));
		});
		const { CaptchaHost } = await import('./captcha-host');
		const { unmount } = render(<CaptchaHost />, { wrapper });
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith('w1'));
		act(() => options.callback!('token-1'));
		await vi.waitFor(() => expect(posted()).toEqual([{ type: 'captcha', token: 'token-1' }]));
		unmount();

		render(<CaptchaHost />, { wrapper });
		await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledTimes(2));
		act(() => options['error-callback']!());
		await vi.waitFor(() => expect(posted()).toContainEqual({ type: 'captcha_error' }));
	});
});
