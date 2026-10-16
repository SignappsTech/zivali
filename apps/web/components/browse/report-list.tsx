'use client';

import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicReport } from '@zivali/types';
import { SpotIllustration } from '@/components/shell/page';
import { Button, Spinner } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';

import { type AdSlot, AD_EVERY, type Point, withAdSlots } from './filters';
import { ReportRow, rowId } from './report-row';

export type ReportListProps = {
	/** Rows in the API's order (boosted first); undefined until the first load. */
	reports: PublicReport[] | undefined;
	center: Point | null;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	/** Filters differ from the defaults: an empty list is "no match", not "empty region". */
	filtered: boolean;
	onResetFilters: () => void;
	includeClosed: boolean;
	onIncludeClosedChange: (includeClosed: boolean) => void;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
	/** The row whose marker preview is open. */
	selected?: string | null;
	/** The row under the pointer or the focus (its marker is drawn larger), null when it leaves. */
	onActiveChange?: (code: string | null) => void;
	/**
	 * P21 insertion point: renders the ad row placed after every 8 report rows (never first, never two in a row); no
	 * ads without it. TASK-36.5 passes the feed AdSlot here.
	 */
	renderAd?: (slot: AdSlot) => React.ReactNode;
};

// The header's "Prijavi" choices (P1): the popover from md, the sheet below it.
const openReportSheet = () => document.querySelector<HTMLDialogElement>('#report-sheet')?.showModal();

/**
 * The P4 list (FR-007): the full keyboard and screen-reader alternative to the map, with the same filters. Rows 20 px
 * apart, "Naloži več" pages 20 at a time (focus moves to the first new row), the loading, error, empty-region and
 * no-match states, and "Pokaži zaključene …" at the end.
 */
export function ReportList({
	reports,
	center,
	isLoading,
	isError,
	onRetry,
	filtered,
	onResetFilters,
	includeClosed,
	onIncludeClosedChange,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	selected,
	onActiveChange,
	renderAd,
}: ReportListProps) {
	const t = useTranslations('browse');
	const items = React.useMemo(() => withAdSlots(reports ?? [], renderAd ? AD_EVERY : null), [reports, renderAd]);
	const loading = isLoading && !reports?.length;
	const empty = !loading && !isError && items.length === 0;

	// "Naloži več": once the next page is in, focus its first row, so keyboard users continue where they were.
	const firstNew = React.useRef<number | null>(null);
	React.useEffect(() => {
		const index = firstNew.current;
		const report = index === null ? undefined : reports?.[index];
		if (!report) return;
		firstNew.current = null;
		document.getElementById(rowId(report.short_code))?.focus();
	}, [reports]);

	if (loading)
		return (
			<div aria-busy="true">
				<p role="status" className="flex items-center gap-2 pb-5 text-sm text-muted-foreground">
					<Spinner />
					{t('loading')}
				</p>
				<ul className="grid gap-5">
					{[0, 1, 2, 3].map((i) => (
						<li key={i} className="flex items-center gap-4">
							<Skeleton className="size-16 shrink-0 rounded-row" />
							<div className="grid flex-1 gap-2">
								<Skeleton className="h-5 w-[55%]" />
								<Skeleton className="h-4 w-3/4" />
							</div>
							<Skeleton className="h-4 w-12" />
						</li>
					))}
				</ul>
			</div>
		);

	return (
		<>
			{isError && (
				<div role="alert" className="mb-5 flex gap-3 rounded-row bg-muted py-4 pr-4 pl-[18px] text-control">
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-destructive"
					/>
					<div className="min-w-0">
						<p>{t('error')}</p>
						<Button variant="text" className="mt-1 -ml-3" onClick={onRetry}>
							{t('error_action')}
						</Button>
					</div>
				</div>
			)}
			{empty && filtered && (
				<div className="pt-3">
					<p>{t('no_match')}</p>
					<Button variant="text" className="mt-2 -ml-3" onClick={onResetFilters}>
						{t('no_match_action')}
					</Button>
				</div>
			)}
			{empty && !filtered && (
				<div className="mx-auto max-w-[360px] pt-1 text-center">
					{/* Stands in for assets/empty-no-reports.png (TASK-31.1); decorative. */}
					<SpotIllustration className="mx-auto w-60" />
					<h2 className="mt-5 font-display text-2xl leading-8 font-semibold tracking-[-0.01em] text-balance">
						{t('empty_title')}
					</h2>
					<p className="mt-2">{t('empty_body')}</p>
					<div className="mt-5 grid gap-1">
						<Button size="lg" className="md:hidden" aria-haspopup="dialog" onClick={openReportSheet}>
							{t('empty_primary')}
						</Button>
						<Button size="lg" className="hidden md:inline-flex" popoverTarget="report-menu">
							{t('empty_primary')}
						</Button>
						<Button asChild variant="text">
							<Link href="/account/alerts">{t('empty_secondary')}</Link>
						</Button>
					</div>
				</div>
			)}
			{items.length > 0 && (
				<ul className="grid gap-5">
					{items.map((item) =>
						item.kind === 'ad' ? (
							<li key={item.key}>{renderAd?.(item)}</li>
						) : (
							<li key={item.key}>
								<ReportRow
									report={item.report}
									center={center}
									selected={item.report.short_code === selected}
									onMouseEnter={() => onActiveChange?.(item.report.short_code)}
									onMouseLeave={() => onActiveChange?.(null)}
									onFocus={() => onActiveChange?.(item.report.short_code)}
									onBlur={() => onActiveChange?.(null)}
								/>
							</li>
						)
					)}
				</ul>
			)}
			{hasNextPage ? (
				<Button
					variant="secondary"
					className="mt-6 w-full"
					loading={isFetchingNextPage}
					onClick={() => {
						firstNew.current = reports?.length ?? null;
						onLoadMore();
					}}
				>
					{t('load_more')}
				</Button>
			) : (
				(items.length > 0 || includeClosed) && (
					<Button variant="text" className="mt-5 -ml-3" onClick={() => onIncludeClosedChange(!includeClosed)}>
						{t(includeClosed ? 'hide_closed' : 'show_closed')}
					</Button>
				)
			)}
		</>
	);
}
