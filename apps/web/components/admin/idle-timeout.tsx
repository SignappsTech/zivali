'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { authError, signOut } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from '@/i18n/client-navigation';

/** Idle time after which the console signs out, and the warning before it (WCAG 2.2.1: at least 20 s to answer). */
export const IDLE_MS = 30 * 60_000;
export const WARN_MS = 2 * 60_000;
/** The console's last activity, shared by its tabs: work in one tab keeps the others signed in. */
export const ACTIVITY_KEY = 'zivali-admin-activity';
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll'] as const;

// Storage can be blocked (private mode, site data off): then each tab keeps its own time.
function stored() {
	try {
		return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
	} catch {
		return 0;
	}
}
function touch(last: React.RefObject<number>) {
	last.current = Date.now();
	try {
		localStorage.setItem(ACTIVITY_KEY, String(last.current));
	} catch {
		// this tab only
	}
}

/** 119 000 ms → "2:00", rounded up so the last second still shows "0:01". */
export const clock = (ms: number) => {
	const seconds = Math.ceil(ms / 1000);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/**
 * P19 idle session timeout (TASK-34.8): after IDLE_MS - WARN_MS without input a dialog counts down and offers to stay
 * signed in, which refreshes the session (supabase-js) and restarts the time; at IDLE_MS the session ends and the
 * admin goes to sign-in with `next`. Input while the dialog shows does not count: the admin answers it. Closing it
 * (Escape, the scrim) is an answer too, so it stays signed in.
 */
export function IdleTimeout() {
	const t = useTranslations('admin');
	const tErrors = useTranslations('errors');
	const router = useRouter();
	const last = React.useRef(0);
	/** Milliseconds left while the warning shows, else null. */
	const [left, setLeft] = React.useState<number | null>(null);

	const end = React.useEffectEvent(async () => {
		setLeft(null);
		await signOut().catch(() => undefined);
		router.replace({ pathname: '/sign-in', query: { next: window.location.pathname + window.location.search } });
	});

	React.useEffect(() => {
		touch(last);
		let ending = false;
		const idle = () => Date.now() - Math.max(last.current, stored());
		const onActivity = () => {
			if (Date.now() - last.current >= 1000 && idle() < IDLE_MS - WARN_MS) touch(last);
		};
		const timer = window.setInterval(() => {
			const time = idle();
			if (time < IDLE_MS) setLeft(time >= IDLE_MS - WARN_MS ? IDLE_MS - time : null);
			else if (!ending) {
				ending = true;
				void end();
			}
		}, 1000);
		for (const name of EVENTS) window.addEventListener(name, onActivity, { capture: true, passive: true });
		return () => {
			window.clearInterval(timer);
			for (const name of EVENTS) window.removeEventListener(name, onActivity, { capture: true });
		};
	}, []);

	const stay = async () => {
		touch(last);
		setLeft(null);
		try {
			const { createClient } = await import('@/lib/supabase/client');
			const { error } = await createClient().auth.refreshSession();
			if (error) throw authError(error);
		} catch (failure) {
			// A session that is gone signs out (supabase-js) and the shell sends the admin to sign-in.
			const code = failure instanceof ApiError ? failure.code : 'INTERNAL';
			toast.error(tErrors(code === 'RATE_LIMITED' ? 'RATE_LIMITED_generic' : code));
		}
	};

	return (
		<Dialog open={left !== null} onOpenChange={(open) => !open && void stay()}>
			<DialogContent>
				<DialogTitle>{t('idle_title')}</DialogTitle>
				<DialogDescription className="tabular-nums">
					{t('idle_body', { time: clock(left ?? 0) })}
				</DialogDescription>
				<DialogFooter>
					<Button onClick={stay}>{t('idle_stay')}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
