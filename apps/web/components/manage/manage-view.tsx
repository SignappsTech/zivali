'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { skipToken } from '@reduxjs/toolkit/query';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useListConversationsQuery } from '@zivali/api/chat';
import type { Locale } from '@zivali/api/client';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { manageApi, useResendManageLinkMutation } from '@zivali/api/manage';
import { useGetReportQuery, useTransitionReportMutation } from '@zivali/api/reports';
import type { ReportOwnerView, ReportTransitionAction } from '@zivali/types';
import { AuthHeading, AuthNote, errorCode, Spot, useErrorText } from '@/components/auth/parts';
import { ConversationRow } from '@/components/chat/conversations';
import { Lightbox, openPhotoClass } from '@/components/photos/lightbox';
import { SUPPORT_EMAIL } from '@/components/content/article';
import {
	canReopen as reopenable,
	expiryNotice,
	trackReunited,
	trackReuniteDialog,
	trackReuniteRefused,
} from '@/components/report/lifecycle-helpers';
import { h1Class, InlineError, PageSkeleton, ringClass } from '@/components/shell/page';
import { StoreProvider } from '@/components/store-provider';
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
import { photoWhole } from '@/lib/photo';
import { getStore } from '@/lib/store';
import { cn } from '@/lib/utils';

// The claim and the claimed report of the P7 manage page (manage-page.tsx), loaded once the claim can run: Redux and
// RTK Query, the report and chat endpoints, the toaster, the P14 confirm dialog and the status parts stay out of the
// page's first download (TASK-17.9, TASK-17.17).

/**
 * C7 POST /v1/manage/claim on the store the view then reads (lib/store.ts: one per locale in the tab); throws the
 * mutation's error, as the hook's unwrap() does.
 */
export async function claimManageLink(locale: Locale, token: string) {
	const request = getStore(locale).dispatch(manageApi.endpoints.claimManageLink.initiate({ token }));
	return request.unwrap().finally(() => request.reset());
}

/** The claimed report with what only it needs: the store for its endpoints and the toaster for its toasts. */
export function ManageClaimed({ code }: { code: string }) {
	const tCommon = useTranslations('common');
	return (
		<StoreProvider>
			<ManageView code={code} />
			<Toaster closeLabel={tCommon('close')} label={tCommon('toasts_label')} />
		</StoreProvider>
	);
}

/**
 * The claimed report: photo, status, facts, private line, messages, the one state note (closed with "Ponovno odpri",
 * under review, or the expiry note with "Podaljšaj za 30 dni") and the actions: Edit (/r/[code]/uredi), Close,
 * "Žival je spet doma" and the manage link sent again to the email on file (C7).
 */
export function ManageView({ code }: { code: string }) {
	const t = useTranslations('report_found');
	const tReport = useTranslations('report');
	const tLife = useTranslations('lifecycle');
	const tCommon = useTranslations('common');
	const errorText = useErrorText();
	const { data, isError, isFetching, refetch } = useGetReportQuery({ code });
	// "Kraj": the public place of the report's fuzzed area, as on its detail page (never the exact point).
	const place = useReversePlaceQuery(data ? { lat: data.area.lat, lng: data.area.lng } : skipToken);
	const conversations = useListConversationsQuery();
	const [transition, { isLoading: saving, originalArgs }] = useTransitionReportMutation();
	const [resend, { isLoading: resending }] = useResendManageLinkMutation();
	const [confirmHome, setConfirmHome] = React.useState(false);
	const [viewing, setViewing] = React.useState<number | null>(null);
	const [thanked, setThanked] = React.useState(false);
	// The reopen window is checked against the time the view opened; the API has the last word (GONE).
	const [now] = React.useState(() => Date.now());
	const closed = data?.status === 'closed' || data?.status === 'reunited';
	// After close or reopen the pressed control is gone: focus moves to what replaced it, the note or the h1.
	const refocus = React.useRef(false);
	const noteRef = React.useRef<HTMLDivElement>(null);
	const headingRef = React.useRef<HTMLHeadingElement>(null);
	React.useEffect(() => {
		if (!refocus.current) return;
		refocus.current = false;
		(closed ? noteRef : headingRef).current?.focus();
	}, [closed]);

	if (!data) return isError ? <InlineError onRetry={refetch} retrying={isFetching} /> : <PageSkeleton />;
	const report = data as ReportOwnerView;

	const act = async (action: ReportTransitionAction) => {
		refocus.current = action === 'close' || action === 'reopen';
		try {
			// C4: a manager closes with a reason; the finder's page has no choice (P7/P14), so the neutral `other`.
			await transition({ code, body: action === 'close' ? { action, reason: 'other' } : { action } }).unwrap();
			if (action === 'mark_reunited') {
				trackReunited(data);
				setThanked(true);
			}
			if (action === 'extend') {
				// The note and its button are gone: say so and keep focus on the page.
				toast.success(tCommon('toast_saved'));
				headingRef.current?.focus();
			}
		} catch (error) {
			refocus.current = false;
			if (action === 'mark_reunited') trackReuniteRefused(errorCode(error));
			toast.error(errorText(error));
		}
	};
	const sendLink = async () => {
		try {
			await resend({ code }).unwrap();
			// The manager's own report: the address exists, unlike on the signed-out lost-link form (P7 §9, CH-438).
			toast.success(t('resend_done_manager'));
		} catch (error) {
			// CONFLICT: no email was given with the report (C7).
			toast.error(errorCode(error) === 'CONFLICT' ? t('resend_no_email') : errorText(error));
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
	const canReopen = reopenable(report, now);
	const notice = expiryNotice(report, now);
	const underReview = report.moderation_state === 'held' || report.moderation_state === 'hidden';
	const threads = (conversations.data?.items ?? []).filter((item) => item.about_report.short_code === code);
	const unread = threads.reduce((sum, item) => sum + item.unread, 0);
	const busy = (action: ReportTransitionAction) => saving && originalArgs?.body.action === action;

	return (
		<>
			{photo && (
				// The first photo opens the fullscreen gallery with all of them (GH #7).
				<>
					<button
						type="button"
						onClick={() => setViewing(0)}
						className={cn('mb-5 rounded-card', openPhotoClass)}
					>
						{/* The API serves the sized display rendition (C5); next/image would proxy it again. */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={photo.url}
							alt={photo.alt}
							width={photo.width}
							height={photo.height}
							className={cn('aspect-[4/3] w-full rounded-card bg-muted', photoWhole)}
						/>
						<span className="sr-only">{tReport('photo_open')}</span>
					</button>
					<Lightbox photos={report.photos} index={viewing} onIndexChange={setViewing} />
				</>
			)}
			<Badge variant={type}>
				<StatusIcon weight="fill" aria-hidden="true" />
				{t(`status_${type}`)}
			</Badge>
			<h1 ref={headingRef} tabIndex={-1} className={cn(h1Class, 'mt-3 outline-none')}>
				{t('manage_title')}
			</h1>
			<dl className="mt-6 grid gap-5">
				<Fact label={t('summary_animal')}>{t(`species_${report.species}`)}</Fact>
				{place.currentData && <Fact label={t('summary_place')}>{place.currentData.label}</Fact>}
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
					{/* Each conversation opens its thread from here (P12 web, as the mobile manage screen). */}
					<ul className="-mx-3 mt-3 grid gap-1">
						{threads.map((conversation) => (
							<ConversationRow key={conversation.id} conversation={conversation} />
						))}
					</ul>
				</section>
			)}

			{underReview && (
				<AuthNote icon={HourglassMediumIcon} className="mt-10">
					<b className="block">{t('under_review_title')}</b>
					{t('under_review_body')}{' '}
					<a
						href={`mailto:${SUPPORT_EMAIL}`}
						className={cn(ringClass, 'rounded-sm font-medium text-primary underline underline-offset-2')}
					>
						{tReport('owner_hidden_contact')}
					</a>
				</AuthNote>
			)}

			{/* P14 W3, S9: from day 25 without an update, the one note says when the report expires (C4). */}
			{notice && !underReview && (
				<div className="mt-10 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control leading-[22px]">
					<ClockIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<div>
						<p>{t('expiry_note', { days: notice.days })}</p>
						<Button
							variant="secondary"
							size="sm"
							className="mt-3"
							loading={busy('extend')}
							onClick={() => act('extend')}
						>
							{t('extend')}
						</Button>
					</div>
				</div>
			)}

			{closed ? (
				<div
					ref={noteRef}
					tabIndex={-1}
					className="mt-10 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control leading-[22px] outline-none"
				>
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
						<ActionRow icon={PencilSimpleIcon} href={{ pathname: '/r/[code]/edit', params: { code } }}>
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
							onClick={() => {
								setConfirmHome(true);
								trackReuniteDialog();
							}}
						>
							{t('manage_returned')}
						</ActionRow>
					</li>
					<li>
						<ActionRow icon={EnvelopeSimpleIcon} busy={resending} onClick={() => void sendLink()}>
							{t('resend_title')}
						</ActionRow>
					</li>
				</ul>
			)}

			{/* P14 §6: the finder marks the animal as home. */}
			<AlertDialog open={confirmHome} onOpenChange={setConfirmHome}>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						// The row that opened the dialog is no trigger: keep focus on the page, at the h1.
						event.preventDefault();
						headingRef.current?.focus();
					}}
				>
					<AlertDialogTitle>{tLife('finder_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tLife('finder_confirm_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction variant="default" onClick={() => act('mark_reunited')}>
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
 * With `href` a link (Messages), else a button.
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
