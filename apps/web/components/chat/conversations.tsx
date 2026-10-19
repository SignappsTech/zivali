'use client';

import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { useTranslations } from 'next-intl';

import { useListConversationsQuery } from '@zivali/api/chat';
import type { AliasKey, ConversationSummary } from '@zivali/types';
import { InlineError, ringClass, SpotIllustration } from '@/components/shell/page';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// P12 parts shared by the inbox list, the thread and the manage page (anonymous managers), as on mobile (TASK-21.4).

/** Row and header title: C9 has no pet name yet, so the P12 fallback by report type. */
export function useConversationTitle() {
	const t = useTranslations('chat');
	return (conversation: Pick<ConversationSummary, 'about_report'>) =>
		t('row_title_fallback', { type: conversation.about_report.type });
}

/** A participant's chosen display name, else the neutral role alias (C9 §Aliases); never an email or phone. */
export function useAlias() {
	const t = useTranslations('chat');
	return (key: AliasKey, displayName?: string) => {
		if (displayName) return key === 'shelter' ? t('alias_shelter', { organisation: displayName }) : displayName;
		// An organisation always has its name; without it, it reads as the finder it is.
		return t(`alias_${key === 'shelter' ? 'finder' : key}`);
	};
}

/** "Prijava zaključena" with the lock icon for a read-only conversation (P12 status word); nothing while active. */
export function StatusWord({ status }: { status: ConversationSummary['status'] }) {
	const t = useTranslations('chat');
	if (status !== 'read_only') return null;
	return (
		<span className="flex items-center gap-1 text-sm font-bold text-muted-foreground">
			<LockSimpleIcon weight="fill" aria-hidden="true" className="size-4" />
			{t('row_status_closed')}
		</span>
	);
}

/** Pet photo (decorative: the title is next to it, P12 copy §7) or a paw on muted. */
function Thumb({ url }: { url: string | null }) {
	return url ? (
		// The API serves the sized thumbnail (C5); next/image would proxy it again.
		// eslint-disable-next-line @next/next/no-img-element
		<img src={url} alt="" width={64} height={64} className="size-16 shrink-0 rounded-row bg-muted object-cover" />
	) : (
		<span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-row bg-muted">
			<PawPrintIcon weight="fill" className="size-7 text-muted-foreground" />
		</span>
	);
}

/**
 * P12 row, 80 px, no dividers: photo 64, title (bold when unread, ", neprebrano" for screen readers), status word, the
 * last line, the 10 px primary dot. `selected` marks the open thread in the web two-pane layout (W1).
 */
export function ConversationRow({
	conversation,
	selected = false,
}: {
	conversation: ConversationSummary;
	selected?: boolean;
}) {
	const t = useTranslations('chat');
	const title = useConversationTitle()(conversation);
	const unread = conversation.unread > 0;
	return (
		<li>
			<Link
				href={{ pathname: '/inbox/[id]', params: { id: conversation.id } }}
				aria-current={selected ? 'page' : undefined}
				className={cn(
					'flex min-h-20 items-center gap-4 rounded-row px-3 py-2 text-foreground transition-[transform,background-color] duration-150 hover:bg-foreground/10 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
					selected && 'bg-secondary hover:bg-secondary',
					ringClass
				)}
			>
				<Thumb url={conversation.about_report.thumb_url} />
				<span className="min-w-0 flex-1">
					<span
						className={cn(
							'block truncate font-display text-lg leading-6',
							unread ? 'font-bold' : 'font-semibold'
						)}
					>
						{unread ? (
							<>
								<span aria-hidden="true">{title}</span>
								<span className="sr-only">{t('row_unread_a11y', { title })}</span>
							</>
						) : (
							title
						)}
					</span>
					<StatusWord status={conversation.status} />
					{conversation.last_message_preview && (
						<span className="block truncate text-control leading-[22px] text-muted-foreground">
							{conversation.last_message_preview}
						</span>
					)}
				</span>
				{unread && <span aria-hidden="true" className="mt-1.5 size-2.5 self-start rounded-full bg-primary" />}
			</Link>
		</li>
	);
}

/**
 * P12 Conversations view: h1 (h2 beside an open thread), newest activity first (C9), skeleton rows while loading, the
 * inline error with retry, the empty state. The header's inbox dot joins `user:<id>` (TASK-22.4), whose
 * `conversation.updated` re-fetches this list, so previews and unread rows follow in real time.
 */
export function ConversationList({ selected, heading: Heading = 'h1' }: { selected?: string; heading?: 'h1' | 'h2' }) {
	const t = useTranslations('chat');
	const tc = useTranslations('common');
	const { data, isError, isFetching, refetch } = useListConversationsQuery();

	let content: React.ReactNode;
	if (data?.items.length)
		content = (
			<ul className="-mx-3 mt-4 grid gap-1">
				{data.items.map((conversation) => (
					<ConversationRow
						key={conversation.id}
						conversation={conversation}
						selected={conversation.id === selected}
					/>
				))}
			</ul>
		);
	else if (data)
		content = (
			<EmptyState
				className="mt-8"
				heading={Heading === 'h1' ? 'h2' : 'h3'}
				illustration={<SpotIllustration />}
				title={t('empty_title')}
				description={t('empty_body')}
			/>
		);
	else if (isError)
		content = (
			<div className="mt-5">
				<InlineError onRetry={() => void refetch()} retrying={isFetching} />
			</div>
		);
	else
		content = (
			<div aria-busy="true" className="mt-5 grid gap-4">
				<p role="status" className="sr-only">
					{tc('loading')}
				</p>
				{['w-3/5', 'w-2/5', 'w-1/2'].map((width) => (
					<div key={width} className="flex items-center gap-4">
						<Skeleton className="size-16 shrink-0 rounded-row" />
						<div className="grid flex-1 gap-2">
							<Skeleton className={cn('h-5', width)} />
							<Skeleton className="h-4 w-4/5" />
						</div>
					</div>
				))}
			</div>
		);

	return (
		<>
			<Heading className="mt-6 font-display text-[28px] leading-8 font-bold tracking-[-0.02em] lg:text-4xl lg:leading-[44px]">
				{t('inbox_title')}
			</Heading>
			{content}
		</>
	);
}
