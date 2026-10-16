'use client';

import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowCounterClockwise';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { canReopen, CloseSearch, expiryNotice, HomeAgain, useQuickTransition } from '@/components/report/lifecycle';
import { OverflowMenu } from '@/components/report/slots/more-menu';
import type { DetailReport } from '@/components/report/slots/types';
import { noteClass } from '@/components/shelters/classes';
import { StoreProvider } from '@/components/store-provider';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

let pending: string | undefined;

/**
 * A toast for the next owner view to show: the edit page leaves it before it goes back to the report, whose toaster
 * mounts only then (the two pages are in different layouts).
 */
export function flash(message: string) {
	pending = message;
}

type Props = { report: DetailReport; className?: string };

/**
 * P9 slot A for the report's managers (signed-in owner or manage-link holder, `is_mine`), P14 on web:
 * - Open or matched: primary `lg` "Žival je spet doma" (the P14 confirm, then /r/[code]/reunited), text button
 *   "Uredi" (/r/[code]/edit); "Zaključi iskanje" is in slot C (OwnerMenu). Due for an update (a lost search idle for 7
 *   days, a found or sighted report 5 days before it expires): the note, and "Nadaljuj iskanje" / "Podaljšaj za 30
 *   dni" takes the primary's place (P14 M5, W3).
 * - Closed or reunited within the reopen window: "Ponovno odpri" ("Nadaljuj iskanje" with the note after the 90-day
 *   expiry); a quiet text button when reunited. Past the window: nothing.
 * "Plakat" joins the text buttons with the web poster (TASK-24.2).
 */
export function OwnerActions(props: Props) {
	return (
		<StoreProvider>
			<Actions {...props} />
		</StoreProvider>
	);
}

function Actions({ report, className }: Props) {
	const tc = useTranslations('common');
	// Day counts need no live clock: the time the view opened is enough; the API has the last word (GONE).
	const [now] = React.useState(() => Date.now());
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!pending) return;
		toast.success(pending);
		pending = undefined;
	}, []);
	// After a transition the pressed control is gone: focus moves to what replaced it.
	const state = `${report.status}|${report.last_owner_update_at}`;
	const shown = React.useRef(state);
	React.useEffect(() => {
		if (shown.current === state) return;
		shown.current = state;
		ref.current?.focus();
	}, [state]);

	// The toaster keeps its place whatever the state, so a toast survives the re-render that follows it.
	return (
		<>
			{report.status === 'open' || report.status === 'matched' ? (
				<div ref={ref} tabIndex={-1} className={cn('outline-none', className)}>
					<Open report={report} now={now} />
				</div>
			) : canReopen(report, now) ? (
				<div ref={ref} tabIndex={-1} className={cn('outline-none', className)}>
					<Reopen report={report} />
				</div>
			) : null}
			<Toaster closeLabel={tc('close')} label={tc('toasts_label')} />
		</>
	);
}

/** P14 S6 to S8: "Ponovno odpri", or the expiry note and "Nadaljuj iskanje"; a quiet text button when reunited. */
function Reopen({ report }: { report: DetailReport }) {
	const tl = useTranslations('lifecycle');
	const reopen = useQuickTransition(report, 'reopen');
	const expired = report.type === 'lost' && report.close_reason === 'expired';
	return (
		<>
			{expired && (
				<div className={cn(noteClass, 'mb-6')}>
					<InfoIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<p>{tl('expired_lost')}</p>
				</div>
			)}
			<Button
				size="lg"
				variant={report.status === 'reunited' ? 'text' : 'default'}
				className={cn(report.status === 'reunited' && '-ml-3')}
				loading={reopen.busy}
				onClick={() => void reopen.go()}
			>
				<ArrowCounterClockwiseIcon weight="bold" aria-hidden="true" />
				{expired ? tl('expired_lost_action') : tl('reopen')}
			</Button>
		</>
	);
}

/** The open search: the one primary, the text buttons and their dialogs. */
function Open({ report, now }: { report: DetailReport; now: number }) {
	const t = useTranslations('report');
	const tl = useTranslations('lifecycle');
	const tf = useTranslations('report_found');
	const [home, setHome] = React.useState(false);
	const extend = useQuickTransition(report, 'extend');
	const notice = expiryNotice(report, now);
	const homeButton = (variant: 'default' | 'text') => (
		<Button
			size={variant === 'default' ? 'lg' : 'default'}
			variant={variant}
			aria-haspopup="dialog"
			onClick={() => setHome(true)}
		>
			<HeartIcon weight="bold" aria-hidden="true" />
			{t('owner_home')}
		</Button>
	);

	return (
		<>
			{notice && (
				<div className={cn(noteClass, 'mb-6')}>
					<ClockIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					{notice.kind === 'reminder' ? (
						<p>
							<b className="block">{tl('reminder_title')}</b>
							{tl('reminder_body', { days: notice.days })}
						</p>
					) : (
						<p>{tf('expiry_note', { days: notice.days })}</p>
					)}
				</div>
			)}
			{notice ? (
				<Button size="lg" loading={extend.busy} onClick={() => void extend.go()}>
					{notice.kind === 'reminder' ? tl('reminder_keep') : tf('extend')}
				</Button>
			) : (
				homeButton('default')
			)}
			<div className="mt-2 -ml-3 flex flex-wrap items-center gap-x-2">
				{notice && homeButton('text')}
				<Button asChild variant="text">
					<Link href={{ pathname: '/r/[code]/edit', params: { code: report.short_code } }}>
						<PencilSimpleIcon weight="bold" aria-hidden="true" />
						{t('owner_edit')}
					</Link>
				</Button>
			</div>
			<HomeAgain report={report} open={home} onOpenChange={setHome} />
		</>
	);
}

/**
 * P9 slot C for managers: "Več možnosti" with "Zaključi iskanje", which opens the P14 reason dialog ("Povečaj doseg"
 * joins it in M4). Its toast shows in slot A's toaster, which stays when the closed report re-renders without slot C.
 */
export function OwnerMenu({ report }: { report: DetailReport }) {
	return (
		<StoreProvider>
			<CloseMenu report={report} />
		</StoreProvider>
	);
}

function CloseMenu({ report }: { report: DetailReport }) {
	const t = useTranslations('report');
	const [closing, setClosing] = React.useState(false);
	return (
		<>
			<OverflowMenu icon={XCircleIcon} label={t('owner_close')} onChoose={() => setClosing(true)} />
			<CloseSearch report={report} open={closing} onOpenChange={setClosing} />
		</>
	);
}
