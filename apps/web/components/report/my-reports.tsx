'use client';

import { ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { flattenPages } from '@zivali/api/pagination';
import { useGetReportQuery, useListMyReportsInfiniteQuery } from '@zivali/api/reports';
import { formatDayMonth } from '@zivali/i18n/format';
import type { ReportOwnerView } from '@zivali/types';
import { CloseSearch, useQuickTransition } from '@/components/report/lifecycle';
import type { DetailReport } from '@/components/report/slots/types';
import { StatusWord } from '@/components/report/status-word';
import { InlineError, h1Class, ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from '@/i18n/client-navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** C10 deep links into My reports (`?r=<code>&action=keep|extend|close`): reminder and expiry notifications, emails. */
export type ReportAction = { code: string; action: 'keep' | 'extend' | 'close' };

/** P8 report row: photo 48 (radius 16), name over the date line, the status word on the right; opens the report. */
function ReportRow({ report }: { report: ReportOwnerView }) {
	const t = useTranslations();
	const locale = useLocale();
	const thumb = report.photos[0]?.thumb_url;
	return (
		<Link
			href={{ pathname: '/r/[code]', params: { code: report.short_code } }}
			className={cn(
				'-mx-2 grid min-h-16 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-row px-2 py-2 text-foreground hover:bg-foreground/10',
				ringClass
			)}
		>
			{thumb ? (
				// eslint-disable-next-line @next/next/no-img-element -- a presigned thumb (C5), nothing to cache
				<img
					src={thumb}
					alt=""
					width={48}
					height={48}
					className="size-12 rounded-[16px] bg-muted object-cover"
				/>
			) : (
				<span className="grid size-12 place-items-center rounded-[16px] bg-muted text-muted-foreground">
					<PawPrintIcon weight="bold" aria-hidden="true" className="size-6" />
				</span>
			)}
			<span className="grid min-w-0">
				<span className="font-bold [overflow-wrap:anywhere]">
					{report.name ?? t(`browse.row_title_${report.type}`, { species: report.species })}
				</span>
				<span className="text-[15px] leading-[22px] text-muted-foreground">
					{t(`report.since_${report.type}`, { date: formatDayMonth(report.event_at, locale) })}
				</span>
			</span>
			<StatusWord report={report} />
		</Link>
	);
}

/**
 * The C10 action on one report, once: "Nadaljuj iskanje" / "Podaljšaj" extends it at once (the link is the tap);
 * "Zaključi iskanje" opens the reason dialog. An ended report says it is already closed. The address then drops the
 * query, so a reload does not repeat it.
 */
function DeepAction({ code, action }: ReportAction) {
	const tl = useTranslations('lifecycle');
	const router = useRouter();
	const { data, isError } = useGetReportQuery({ code });
	const report = data as DetailReport | undefined;
	const extend = useQuickTransition({ short_code: code }, 'extend');
	const [closing, setClosing] = React.useState(true);
	const done = React.useRef(false);
	const active = report?.is_mine && (report.status === 'open' || report.status === 'matched');
	const clear = React.useCallback(() => router.replace('/my-reports'), [router]);

	React.useEffect(() => {
		if (done.current || (!report && !isError) || (action === 'close' && active)) return;
		done.current = true;
		if (active) void extend.go();
		else toast.info(tl('already_closed'));
		clear();
	}, [report, isError, active, action, extend, tl, clear]);

	if (action !== 'close' || !report || !active) return null;
	return (
		<CloseSearch
			report={report}
			open={closing}
			onOpenChange={(open) => {
				setClosing(open);
				if (!open) clear();
			}}
		/>
	);
}

/**
 * My reports (P8 "Moje prijave"; C15 /moje-prijave for accounts and manage-link sessions, and the section under
 * "Moje živali"): the viewer's reports, open and past, newest first, paged with the C1 cursor. `level` 2 is the
 * section heading on the pets page.
 */
export function MyReports({ level = 1, deepLink }: { level?: 1 | 2; deepLink?: ReportAction }) {
	const t = useTranslations('pets');
	const tc = useTranslations('common');
	const query = useListMyReportsInfiniteQuery();
	const reports = query.data ? flattenPages(query.data) : undefined;
	const Heading = level === 1 ? 'h1' : 'h2';
	const headingId = React.useId();

	let body: React.ReactNode;
	if (query.isError && !reports)
		body = (
			<div className="mt-6">
				<InlineError onRetry={query.refetch} retrying={query.isFetching} />
			</div>
		);
	else if (!reports)
		body = (
			<div aria-busy="true" className="mt-6">
				<p role="status" className="sr-only">
					{tc('loading')}
				</p>
				<div aria-hidden="true" className="grid gap-2">
					{['w-32', 'w-24'].map((width) => (
						<div key={width} className="flex min-h-16 items-center gap-4">
							<Skeleton className="size-12 shrink-0 rounded-[16px]" />
							<div className="grid flex-1 gap-2">
								<Skeleton className={cn('h-5', width)} />
								<Skeleton className="h-4 w-40" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	else if (reports.length === 0)
		body = (
			<p className="mt-6 flex gap-3 text-muted-foreground">
				<ClipboardTextIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
				{t('my_reports_empty')}
			</p>
		);
	else
		body = (
			<>
				<ul aria-labelledby={headingId} className="mt-4 grid gap-2">
					{reports.map((report) => (
						<li key={report.id}>
							<ReportRow report={report} />
						</li>
					))}
				</ul>
				{query.hasNextPage && (
					<Button
						variant="secondary"
						className="mt-6"
						loading={query.isFetchingNextPage}
						onClick={() => void query.fetchNextPage()}
					>
						{tc('load_more')}
					</Button>
				)}
			</>
		);

	return (
		<section aria-labelledby={headingId}>
			<Heading
				id={headingId}
				className={level === 1 ? h1Class : 'font-display text-3xl font-bold tracking-[-0.015em]'}
			>
				{t('my_reports')}
			</Heading>
			{body}
			{deepLink && <DeepAction {...deepLink} />}
		</section>
	);
}
