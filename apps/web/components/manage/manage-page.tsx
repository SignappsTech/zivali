'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/ssr/LinkBreak';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ShieldWarningIcon } from '@phosphor-icons/react/dist/ssr/ShieldWarning';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/ssr/WifiSlash';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useListConversationsQuery } from '@zivali/api/chat';
import { ApiError } from '@zivali/api/client';
import { useClaimManageLinkMutation } from '@zivali/api/manage';
import { useGetReportQuery, useTransitionReportMutation } from '@zivali/api/reports';
import type { ReportOwnerView, ReportTransitionAction } from '@zivali/types';
import { AuthHeading, AuthNote, errorCode, Spot, useErrorText } from '@/components/auth/parts';
import { useCaptcha } from '@/components/auth/turnstile';
import { h1Class, InlineError, PageSkeleton, ringClass } from '@/components/shell/page';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { statusIcons } from '@/components/ui/status-label';
import { Link } from '@/i18n/navigation';
import { ensureSession } from '@/lib/auth';
import { fragmentToken } from '@/lib/manage-link';
import { cn } from '@/lib/utils';

import { useAutoRetry } from './use-auto-retry';

const REOPEN_DAYS = 7;
// A link that is unknown, malformed or closed beyond the reopen window (C7 POST /v1/manage/claim).
const INVALID = ['NOT_FOUND', 'GONE', 'VALIDATION'];

/**
 * P7 manage page (`/m#<token>`, `/en/m#<token>`, C7): reads the token from the fragment, signs in anonymously unless
 * this browser has a session (captcha when enabled), claims the report and shows it. A failed captcha or a lost
 * connection retries every 60 s and on reconnect; an unknown or expired link says so. No ad slot (C15 protected).
 */
export function ManagePage() {
	const t = useTranslations('report_found');
	const tCommon = useTranslations('common');
	const te = useTranslations('errors');
	const errorText = useErrorText();
	const captcha = useCaptcha();
	const [claim] = useClaimManageLinkMutation();
	const { getToken } = captcha;

	const task = React.useCallback(async () => {
		const token = fragmentToken();
		if (!token) throw new ApiError('NOT_FOUND', 'NOT_FOUND');
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

/** The claimed report: photo, status, facts, private line, messages, the one state note and the actions. */
function ManageView({ code }: { code: string }) {
	const t = useTranslations('report_found');
	const tLife = useTranslations('lifecycle');
	const errorText = useErrorText();
	const { data, isError, isFetching, refetch } = useGetReportQuery({ code });
	const conversations = useListConversationsQuery();
	const [transition, { isLoading: saving, originalArgs }] = useTransitionReportMutation();
	const [confirmHome, setConfirmHome] = React.useState(false);
	const [thanked, setThanked] = React.useState(false);
	// Read once per render for the reopen window; a page left open past it still gets GONE from the API.
	const [now] = React.useState(() => Date.now());

	if (!data) return isError ? <InlineError onRetry={refetch} retrying={isFetching} /> : <PageSkeleton />;
	const report = data as ReportOwnerView;

	const act = async (action: ReportTransitionAction) => {
		try {
			await transition({ code, body: { action } }).unwrap();
			if (action === 'mark_reunited') setThanked(true);
		} catch (error) {
			toast.error(errorText(error));
		}
	};

	if (thanked)
		return (
			<>
				<Spot>
					<HeartIcon weight="bold" />
				</Spot>
				<AuthHeading focus>{tLife('finder_thanks_title')}</AuthHeading>
				<p className="mt-3 text-lg leading-7">{tLife('finder_thanks_body')}</p>
			</>
		);

	const type = report.type === 'sighted' ? 'sighted' : 'found';
	const StatusIcon = statusIcons[type];
	const photo = report.photos[0];
	const closedAt = report.closed_at ?? report.reunited_at;
	const closed = report.status === 'closed' || report.status === 'reunited';
	const canReopen = closed && !!closedAt && now - Date.parse(closedAt) < REOPEN_DAYS * 86_400_000;
	const threads = (conversations.data?.items ?? []).filter((item) => item.about_report.short_code === code);
	const unread = threads.reduce((sum, item) => sum + item.unread, 0);
	const busy = (action: ReportTransitionAction) => saving && originalArgs?.body.action === action;

	return (
		<>
			{photo && (
				// The API serves the sized display rendition (C5); next/image would proxy it again.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={photo.url}
					alt={photo.alt}
					width={photo.width}
					height={photo.height}
					className="mb-5 aspect-[4/3] w-full rounded-card bg-muted object-cover"
				/>
			)}
			<Badge variant={type}>
				<StatusIcon weight="fill" aria-hidden="true" />
				{t(`status_${type}`)}
			</Badge>
			<h1 className={cn(h1Class, 'mt-3')}>{t('manage_title')}</h1>
			<dl className="mt-6 grid gap-5">
				<Fact label={t('summary_animal')}>{t(`species_${report.species}`)}</Fact>
				<Fact label={t('summary_situation')}>
					{t(type === 'found' ? 'summary_with_me' : 'summary_not_with_me')}
				</Fact>
			</dl>
			<p className="mt-6 flex gap-2 text-sm text-muted-foreground">
				<LockSimpleIcon weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
				{t('manage_private_note')}
			</p>

			{threads.length > 0 && (
				<section aria-labelledby="manage-messages" className="mt-10">
					<h2 id="manage-messages" className="font-display text-2xl font-bold tracking-[-0.015em]">
						{t('manage_messages')}
					</h2>
					{unread > 0 && (
						<p className="mt-2 flex items-center gap-2 font-bold tabular-nums">
							<ChatCircleIcon weight="bold" aria-hidden="true" className="size-5 text-primary" />
							{t('manage_unread', { count: unread })}
						</p>
					)}
					<Button asChild size="lg" className="mt-4 w-full">
						<Link href="/inbox">{t('manage_open_messages')}</Link>
					</Button>
				</section>
			)}

			{(report.moderation_state === 'held' || report.moderation_state === 'hidden') && (
				<AuthNote icon={HourglassMediumIcon} className="mt-10">
					<b className="block">{t('under_review_title')}</b>
					{t('under_review_body')}
				</AuthNote>
			)}

			{closed ? (
				<div className="mt-10 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control leading-[22px]">
					<CheckCircleIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<div>
						<p>{t('closed_note')}</p>
						{canReopen && (
							<Button
								variant="secondary"
								size="sm"
								className="mt-3"
								loading={busy('reopen')}
								onClick={() => act('reopen')}
							>
								{t('reopen')}
							</Button>
						)}
					</div>
				</div>
			) : (
				<ul className="mt-8 grid gap-1">
					{threads.length === 0 && (
						<li>
							<ActionRow icon={ChatCircleIcon} href="/inbox">
								{t('manage_messages')}
							</ActionRow>
						</li>
					)}
					<li>
						<ActionRow icon={PencilSimpleIcon} href={{ pathname: '/r/[code]', params: { code } }}>
							{t('manage_edit')}
						</ActionRow>
					</li>
					<li>
						<ActionRow icon={CheckCircleIcon} busy={busy('close')} onClick={() => act('close')}>
							{t('manage_close')}
						</ActionRow>
					</li>
					<li>
						<ActionRow
							icon={HeartIcon}
							busy={busy('mark_reunited')}
							aria-haspopup="dialog"
							onClick={() => setConfirmHome(true)}
						>
							{t('manage_returned')}
						</ActionRow>
					</li>
				</ul>
			)}

			{/* P14 §6: the finder marks the animal as home. */}
			<AlertDialog open={confirmHome} onOpenChange={setConfirmHome}>
				<AlertDialogContent>
					<AlertDialogTitle>{tLife('finder_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tLife('finder_confirm_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => act('mark_reunited')}>
							{tLife('finder_confirm_yes')}
						</AlertDialogAction>
						<AlertDialogCancel>{tLife('finder_confirm_no')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<dt className="text-sm font-bold text-muted-foreground">{label}</dt>
			<dd className="mt-0.5">{children}</dd>
		</div>
	);
}

/**
 * Manage action as a text row (P7): 56 px, icon 20 in `primary`, hover `foreground` at 10 %, aligned to the text.
 * With `href` a link (Edit, Messages), else a button.
 */
function ActionRow({
	icon: Icon,
	href,
	busy = false,
	children,
	...props
}: React.ComponentProps<'button'> & {
	icon: PhosphorIcon;
	href?: React.ComponentProps<typeof Link>['href'];
	busy?: boolean;
}) {
	const className = cn(
		'-mx-3 flex min-h-14 w-[calc(100%+1.5rem)] cursor-pointer items-center gap-3.5 rounded-row px-3 text-left font-semibold hover:bg-foreground/10 aria-busy:cursor-progress',
		ringClass
	);
	const content = (
		<>
			<Icon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-primary" />
			{children}
		</>
	);
	if (href)
		return (
			<Link href={href} className={className}>
				{content}
			</Link>
		);
	return (
		<button
			type="button"
			className={className}
			aria-busy={busy || undefined}
			{...props}
			onClick={busy ? undefined : props.onClick}
		>
			{content}
		</button>
	);
}
