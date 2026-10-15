'use client';

import type { Icon } from '@phosphor-icons/react';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { MarkNotificationsReadInput } from '@zivali/types';
import { useListNotificationsQuery, useMarkReadMutation } from '@zivali/api/notifications';
import { useErrorText } from '@/components/auth/parts';
import { InlineError, ringClass, SpotIllustration } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { type Group, type InboxRow, inboxGroups, type Kind, timeLabel } from './model';

/** One page: the API's maximum (C10); older notifications stay in the API. */
export const PAGE = { limit: 50 };

const ICONS: Record<Kind, { Icon: Icon; weight: 'fill' | 'bold' | 'regular'; tone?: string }> = {
	chip: { Icon: ShieldCheckIcon, weight: 'fill', tone: 'text-status-found-subtle-foreground' },
	match: { Icon: SparkleIcon, weight: 'fill', tone: 'text-status-found-subtle-foreground' },
	message: { Icon: ChatCircleIcon, weight: 'fill' },
	// The C10 payload has no photo (P13 draws the pet photo); the lost status colour marks the alert.
	nearby: { Icon: PawPrintIcon, weight: 'fill', tone: 'text-status-lost-subtle-foreground' },
	reminder: { Icon: ClockIcon, weight: 'bold' },
	system: { Icon: InfoIcon, weight: 'regular' },
};

const GROUP_KEY = { today: 'group_today', week: 'group_week', earlier: 'group_earlier' } as const;

/**
 * P13 Notifications view (FR-010): h1 with "Mark all as read" while unread exist, rows grouped Today, This week,
 * Earlier; a row opens its target and marks itself read. Loading skeleton rows, inline error with retry, empty state.
 */
export function NotificationsView() {
	const t = useTranslations('notifications');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const errorText = useErrorText();
	const { data, isError, isFetching, refetch } = useListNotificationsQuery(PAGE);
	const [markRead] = useMarkReadMutation();
	// A background action: a failure is a toast, the list stays as it was.
	const read = (input: MarkNotificationsReadInput) =>
		void markRead(input)
			.unwrap()
			.catch((failure: unknown) => toast.error(errorText(failure)));
	const groups = data ? inboxGroups(data.items, new Date(), locale) : [];

	let content: React.ReactNode;
	if (data && groups.length > 0)
		// Phone: rows run edge to edge and their 20 px padding lines the icons up with the h1 (P13 M1); web: inset (W1).
		content = (
			<div className="-mx-5 md:mx-0">
				{groups.map(({ group, rows }) => (
					<section key={group} aria-labelledby={`notifications-${group}`}>
						<h2
							id={`notifications-${group}`}
							className="mt-3 mb-0.5 px-5 text-[15px] leading-5 font-bold text-muted-foreground"
						>
							{t(GROUP_KEY[group])}
						</h2>
						<ul>
							{rows.map((row) => (
								<Row
									key={row.id}
									row={row}
									group={group}
									onOpen={() => row.unread && read({ ids: row.ids })}
								/>
							))}
						</ul>
					</section>
				))}
			</div>
		);
	else if (data)
		content = (
			<EmptyState
				className="mt-8"
				illustration={<SpotIllustration />}
				title={t('empty_title')}
				description={t('empty_body')}
				action={
					<Button asChild variant="text" className="-ml-3">
						<Link href="/account/alerts">{t('empty_action')}</Link>
					</Button>
				}
			/>
		);
	else if (isError)
		content = (
			<div className="mt-5">
				<InlineError onRetry={() => void refetch()} retrying={isFetching} />
			</div>
		);
	else content = <RowsSkeleton label={tCommon('loading')} />;

	return (
		<>
			<div className="mt-6 flex flex-wrap items-center justify-between gap-x-3">
				<h1 className="font-display text-[28px] leading-8 font-bold tracking-[-0.02em] lg:text-4xl lg:leading-[44px]">
					{t('title')}
				</h1>
				{data && data.unread > 0 && (
					<Button variant="text" onClick={() => read({ all: true })}>
						{t('mark_all')}
					</Button>
				)}
			</div>
			{content}
			<Toaster closeLabel={tCommon('close')} label={tCommon('toasts_label')} />
		</>
	);
}

function Row({ row, group, onOpen }: { row: InboxRow; group: Group; onOpen: () => void }) {
	const t = useTranslations('notifications');
	const locale = useLocale();
	// Keys are built from the type; @zivali/i18n check keeps every in-app type's title and body in both locales.
	const title = t(`${row.type}.title`, row.values);
	const { Icon, weight, tone } = ICONS[row.kind];

	return (
		<li>
			<Link
				href={row.href}
				onClick={onOpen}
				className={cn(
					'relative grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-x-3.5 rounded-row px-5 py-2 text-foreground transition-[transform,background-color] duration-150 hover:bg-foreground/6 active:scale-[0.98] active:bg-accent active:text-accent-foreground motion-reduce:transition-none motion-reduce:active:scale-100',
					ringClass
				)}
			>
				{row.unread && (
					<span
						aria-hidden="true"
						className="absolute top-[29px] left-[5px] size-2.5 rounded-full bg-primary"
					/>
				)}
				<span className={cn('grid size-12 place-items-center', tone)}>
					<Icon weight={weight} aria-hidden="true" className="size-[30px]" />
				</span>
				<div className="min-w-0">
					<h3 className={cn('text-[17px] leading-6', row.unread ? 'font-bold' : 'font-medium')}>
						{row.unread ? (
							<>
								<span aria-hidden="true">{title}</span>
								<span className="sr-only">{t('row_unread_a11y', { title })}</span>
							</>
						) : (
							title
						)}
					</h3>
					<p className="mt-0.5 text-[15px] leading-[22px]">{t(`${row.type}.body`, row.values)}</p>
				</div>
				<time
					dateTime={row.created_at}
					className="text-[13px] leading-6 whitespace-nowrap text-muted-foreground tabular-nums"
				>
					{timeLabel(row.created_at, group, locale)}
				</time>
			</Link>
			{row.report_code && (
				<div className="-mt-1 flex flex-wrap gap-x-1 pr-5 pb-1 pl-[70px]">
					<Button asChild variant="text">
						<Link href={{ pathname: '/my-reports', query: { r: row.report_code, action: 'keep' } }}>
							{t('reminder_keep')}
						</Link>
					</Button>
					<Button asChild variant="text" className="text-foreground">
						<Link href={{ pathname: '/my-reports', query: { r: row.report_code, action: 'close' } }}>
							{t('reminder_close')}
						</Link>
					</Button>
				</div>
			)}
		</li>
	);
}

/** Loading (P13): skeleton rows in the final shape, announced once. */
function RowsSkeleton({ label }: { label: string }) {
	return (
		<div aria-busy="true" className="mt-5 grid gap-4">
			<p role="status" className="sr-only">
				{label}
			</p>
			{['w-3/5', 'w-2/5', 'w-1/2', 'w-1/3'].map((width) => (
				<div key={width} className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3.5">
					<Skeleton className="size-12 rounded-row" />
					<div className="grid content-center gap-2">
						<Skeleton className={cn('h-5', width)} />
						<Skeleton className="h-4 w-4/5" />
					</div>
				</div>
			))}
		</div>
	);
}
