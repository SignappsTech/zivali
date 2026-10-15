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
		expect(append).toHaveBeenCalledOnce();
		// The widget goes with its form.
		unmount();
		expect(turnstile.remove).toHaveBeenCalledWith('w1');
	});
});
