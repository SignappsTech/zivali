'use client';

import * as React from 'react';

import { errorCode } from '@/components/auth/error-text';

/** C7: a failed or unavailable captcha and a lost connection fix themselves, so the task is tried again. */
export const isTransient = (error: unknown) => ['CAPTCHA_FAILED', 'NETWORK'].includes(errorCode(error));

export const RETRY_MS = 60_000;

type State<T> =
	| { status: 'idle' | 'running'; result?: undefined; error?: unknown }
	| { status: 'done'; result: T; error?: undefined }
	| { status: 'waiting' | 'failed'; result?: undefined; error: unknown };

/**
 * Runs `task` (keep it stable with useCallback) when `run()` is called. After a transient failure it is `waiting`
 * and runs again every 60 s and as soon as the browser is back online, until it succeeds or fails for another
 * reason (`failed`). The caller keeps its input (the draft) and shows a calm note while `error` is transient; a
 * transient error stays set during the retry, so the note does not flicker.
 */
export function useAutoRetry<T>(task: () => Promise<T>) {
	const [state, setState] = React.useState<State<T>>({ status: 'idle' });
	// One attempt at a time: a click, the timer and `online` can coincide.
	const inFlight = React.useRef(false);

	const run = React.useCallback(async () => {
		if (inFlight.current) return;
		inFlight.current = true;
		setState((previous) => ({
			status: 'running',
			error: isTransient(previous.error) ? previous.error : undefined,
		}));
		try {
			const result = await task();
			setState({ status: 'done', result });
		} catch (error) {
			setState({ status: isTransient(error) ? 'waiting' : 'failed', error });
		} finally {
			inFlight.current = false;
		}
	}, [task]);

	const waiting = state.status === 'waiting';
	React.useEffect(() => {
		if (!waiting) return;
		// An interval, not a timeout: a retry that fails at once may never commit `running`, so this effect stays.
		const timer = setInterval(run, RETRY_MS);
		window.addEventListener('online', run);
		return () => {
			clearInterval(timer);
			window.removeEventListener('online', run);
		};
	}, [waiting, run]);

	return { ...state, run };
}
