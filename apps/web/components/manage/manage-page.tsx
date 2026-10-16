'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/ssr/WifiSlash';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { ApiError } from '@zivali/api/client';
import { useClaimManageLinkMutation } from '@zivali/api/manage';
import { AuthHeading, AuthNote, errorCode, Spot, useErrorText } from '@/components/auth/parts';
import { useCaptcha } from '@/components/auth/turnstile';
import { PageSkeleton } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { takeManageToken } from '@/lib/manage-link';

import { useAutoRetry } from './use-auto-retry';

// Only a link to claim loads the session code (lib/auth: supabase-js, zod) and the report view (its endpoints, the
// confirm dialog): a page without one, or before the claim, ships neither (TASK-17.9). The claim loads both, so a
// failed download is the claim's error, with its retry.
const loadView = () => import('./manage-view');
const ManageView = dynamic(() => loadView().then((m) => m.ManageView), { ssr: false, loading: () => <PageSkeleton /> });

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
	const errorText = useErrorText();
	// api.js loads only for a sign-in that needs the captcha: not with a session already, nor without a link.
	const captcha = useCaptcha({ lazy: true });
	const [claim] = useClaimManageLinkMutation();
	const { getToken } = captcha;

	const task = React.useCallback(async () => {
		const token = takeManageToken();
		if (!token) throw new ApiError('NOT_FOUND', 'NOT_FOUND');
		const [{ ensureSession }] = await Promise.all([import('@/lib/auth'), loadView()]);
		await ensureSession(getToken);
		return claim({ token }).unwrap();
	}, [claim, getToken]);
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
	if (claimed.status === 'done') body = <ManageView code={claimed.result.short_code} />;
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
		<main id="main" className="mx-auto box-content max-w-[560px] px-5 pt-6 pb-16 lg:pb-24">
			{claimed.status !== 'done' && captcha.widget}
			{body}
			<Toaster closeLabel={tCommon('close')} label={tCommon('toasts_label')} />
		</main>
	);
}
