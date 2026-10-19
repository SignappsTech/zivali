'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/ssr/WifiSlash';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { ApiError, type Locale } from '@zivali/api/client';
import { AuthHeading, AuthNote, errorCode, Spot, useErrorText } from '@/components/auth/parts';
import { useCaptcha } from '@/components/auth/turnstile';
import { PageSkeleton } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { hasSessionCookie } from '@/lib/auth-light';
import { takeManageToken } from '@/lib/manage-link';

import { useAutoRetry } from './use-auto-retry';

// Only a claim that can run loads the session code (lib/auth: supabase-js) and the claim with the report view (Redux,
// its endpoints, the toaster, the confirm dialog): at once with a session, else after the captcha. A page without a
// link, or a visit that never passes the captcha, ships none of it (TASK-17.9, TASK-17.17). A failed download is the
// claim's error, with its retry.
const loadView = () => import('./manage-view');
const ManageClaimed = dynamic(() => loadView().then((m) => m.ManageClaimed), {
	ssr: false,
	loading: () => <PageSkeleton />,
});

// A link that is unknown, malformed or closed beyond the reopen window (C7 POST /v1/manage/claim).
const INVALID = ['NOT_FOUND', 'GONE', 'VALIDATION'];

/**
 * P7 manage page (`/m#<token>`, `/en/m#<token>`, C7): takes the token out of the URL (takeManageToken), signs in anonymously unless
 * this browser has a session (captcha when enabled), claims the report and shows it. A failed captcha or a lost
 * connection retries every 60 s and on reconnect; an unknown or expired link says so. No ad slot (C15 protected).
 */
export function ManagePage() {
	const t = useTranslations('report_found');
	const tCommon = useTranslations('common');
	const te = useTranslations('errors');
	const locale = useLocale() as Locale;
	const errorText = useErrorText();
	// api.js loads only for a sign-in that needs the captcha: not with a session already, nor without a link.
	const captcha = useCaptcha({ lazy: true });
	const { getToken } = captcha;

	const task = React.useCallback(async () => {
		const token = takeManageToken();
		if (!token) throw new ApiError('NOT_FOUND', 'NOT_FOUND');
		// No session cookie: the anonymous sign-in needs the captcha, so it comes first.
		const captchaToken = hasSessionCookie() ? undefined : await getToken();
		// A chunk that fails to download is a lost connection: the offline note and the automatic retry.
		const [{ ensureSession }, { claimManageLink }] = await Promise.all([import('@/lib/auth'), loadView()]).catch(
			(cause) => {
				throw new ApiError('NETWORK', 'NETWORK', { cause });
			}
		);
		// A stale cookie (no session after all) asks for the captcha here instead.
		await ensureSession(captchaToken ? async () => captchaToken : getToken);
		return claimManageLink(locale, token);
	}, [getToken, locale]);
	const claimed = useAutoRetry(task);
	const { run } = claimed;
	React.useEffect(() => {
		void run();
		// Another link pasted into this tab changes only the fragment: no reload.
		window.addEventListener('hashchange', run);
		return () => window.removeEventListener('hashchange', run);
	}, [run]);

	const code = claimed.error ? errorCode(claimed.error) : null;
	let body: React.ReactNode;
	if (claimed.status === 'done') body = <ManageClaimed code={claimed.result.short_code} />;
	else if (claimed.status === 'failed' && code && INVALID.includes(code))
		body = (
			<>
				<Spot>
					<LinkBreakIcon weight="bold" />
				</Spot>
				<AuthHeading focus>{t('link_invalid_title')}</AuthHeading>
				<p className="mt-3 text-lg leading-7">{t('link_invalid_body')}</p>
			</>
		);
	else if (claimed.error)
		body = (
			<>
				<h1 className="sr-only">{t('manage_title')}</h1>
				{code === 'NETWORK' ? (
					<AuthNote icon={WifiSlashIcon}>
						<b>{te('offline_title')}</b> {te('offline_body')}
					</AuthNote>
				) : (
					<AuthNote icon={code === 'CAPTCHA_FAILED' ? ShieldWarningIcon : HourglassMediumIcon}>
						{errorText(claimed.error)}
					</AuthNote>
				)}
				<Button variant="text" className="mt-2 -ml-3" loading={claimed.status === 'running'} onClick={run}>
					<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
					{tCommon('try_again')}
				</Button>
			</>
		);
	else body = <PageSkeleton />;

	return (
		// The skeleton is about 456 px tall: the claim result keeps that space so the footer does not jump (CLS).
		<main
			id="main"
			className={`mx-auto box-content max-w-[560px] px-5 pt-6 pb-16 lg:pb-24${claimed.status === 'done' ? '' : ' min-h-[456px]'}`}
		>
			{/* The captcha widget is 65 px tall: its slot is reserved so inserting it does not shift the page (CLS). */}
			{claimed.status !== 'done' && captcha.widget && <div className="min-h-[65px]">{captcha.widget}</div>}
			{body}
		</main>
	);
}
