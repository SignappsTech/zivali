'use client';

import type { Icon } from '@phosphor-icons/react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { ChatTeardropTextIcon } from '@phosphor-icons/react/dist/ssr/ChatTeardropText';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';
import { KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/ssr/WifiSlash';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { DropdownMenu } from 'radix-ui';
import * as React from 'react';
import { useDispatch, useStore } from 'react-redux';
import { toast } from 'sonner';

import { track } from '@zivali/analytics';
import { useSession } from '@zivali/api/auth';
import {
	chatApi,
	subscribeConversation,
	useBlockParticipantMutation,
	useListConversationsQuery,
	useListMessagesQuery,
	useMarkConversationReadMutation,
	useSendMessageMutation,
} from '@zivali/api/chat';
import { ApiError } from '@zivali/api/client';
import type { ApiStore, QueryError } from '@zivali/api/rtk';
import { formatDate, formatDayMonth, type Locale } from '@zivali/i18n/format';
import type { Message, Uuid } from '@zivali/types';
import type { AbuseTarget } from '@/components/abuse/report-abuse';
import { AuthNote, useErrorText } from '@/components/auth/parts';
import { type Conversation, StatusWord, useAlias, useConversationTitle } from '@/components/chat/conversations';
import { dayNumber } from '@/components/notifications/model';
import { InlineError, ringClass } from '@/components/shell/page';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// P12 thread (C9), as the mobile one (TASK-21.4). Messages, the send queue and the reported ids live in memory only:
// nothing of the conversation goes to browser storage, analytics or the console. No ad component here (C15).

// The dialog (captcha, abuse API) loads with the first "Prijavi zlorabo".
const ReportAbuseDialog = dynamic(() => import('@/components/abuse/report-abuse').then((m) => m.ReportAbuseDialog), {
	ssr: false,
});

/** C9: body 1–2000 characters; the counter shows in the last 100 (P12 copy). */
const MAX = 2000;
const COUNTER_FROM = 100;
/** System message bodies the client words itself (P12 copy §5); any other body is shown as sent. */
const SYSTEM = ['confirmed', 'contact', 'closed', 'home', 'reopened'] as const;

/** A message on its way, keyed by a client id until the API answers with the stored message. */
type Pending = { key: string; body: string; state: 'sending' | 'queued' | 'failed' };
/** Why the composer is off: read-only replaces it; the others disable it with their sentence (P12 M6, M9). */
type Lock = 'read_only' | 'blocked_by_you' | 'blocked_you' | 'unverified';
type Abuse = { target: AbuseTarget; block: boolean };
type Row = { key: string; at: string | number } & (
	{ kind: 'day' } | { kind: 'message'; message: Message } | { kind: 'pending'; pending: Pending }
);

/** Each part's rows (oldest first) with a day separator before each new Ljubljana day, counted across the parts. */
function withDays(parts: Row[][]): Row[][] {
	let lastDay: number | undefined;
	return parts.map((rows) =>
		rows.flatMap((row) => {
			const day = dayNumber(new Date(row.at));
			if (day === lastDay) return [row];
			lastDay = day;
			return [{ kind: 'day', key: `day-${day}`, at: row.at }, row];
		})
	);
}

const codeOf = (error: unknown) =>
	error instanceof ApiError ? error.code : (error as Partial<QueryError> | null)?.data?.code;

// The browser's own connection state (online/offline events); the server render counts as online.
const subscribeOnline = (listener: () => void) => {
	window.addEventListener('online', listener);
	window.addEventListener('offline', listener);
	return () => {
		window.removeEventListener('online', listener);
		window.removeEventListener('offline', listener);
	};
};
const useOnline = () =>
	React.useSyncExternalStore(
		subscribeOnline,
		() => navigator.onLine,
		() => true
	);

const metaClass = 'flex items-center gap-1 text-[13px] leading-4 text-muted-foreground tabular-nums';
const menuRowClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 font-semibold outline-hidden select-none data-[highlighted]:bg-foreground/10 [&_svg]:size-5';
const spinnerClass =
	'inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:[animation-duration:2.4s]';

/**
 * Conversation (P12): the C9 summary (header, own alias, status) comes from the inbox list. Keyed by id, so moving to
 * another conversation in the two-pane layout starts with a fresh queue and composer.
 */
export function Thread({ id }: { id: Uuid }) {
	const tc = useTranslations('common');
	const te = useTranslations('errors');
	const tn = useTranslations('chat');
	// Refetched on open: the cached first page may predate a fresh conversation (a confirmed match opens it at once).
	const { data, isError, isFetching, fulfilledTimeStamp, refetch } = useListConversationsQuery(undefined, {
		refetchOnMountOrArgChange: true,
	});
	// "Not found" only from a list fetched since opening, never from the cached one the refetch has yet to replace.
	const [opened] = React.useState(Date.now);
	const fresh = !isFetching && (fulfilledTimeStamp ?? 0) >= opened;
	const conversation = data?.items.find((item) => item.id === id);
	if (conversation) return <ThreadView key={id} conversation={conversation} />;
	return (
		<div className="pt-2">
			<BackLink />
			{isError ? (
				<div className="mt-4">
					<InlineError onRetry={() => void refetch()} retrying={isFetching} />
				</div>
			) : data && fresh ? (
				// Not among the user's conversations (C9 has no single-conversation GET): nothing to retry.
				<div role="alert" className="mt-4 grid gap-3 rounded-row bg-muted p-4 text-control leading-[22px]">
					<p>{te('NOT_FOUND')}</p>
					<Button asChild variant="text" size="sm" className="justify-self-start">
						<Link href="/inbox">{tn('inbox_title')}</Link>
					</Button>
				</div>
			) : (
				<div aria-busy="true" className="mt-4 grid gap-3">
					<p role="status" className="sr-only">
						{tc('loading')}
					</p>
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-12 w-full rounded-[16px]" />
				</div>
			)}
		</div>
	);
}

/** Back to the list below lg (the list is beside the thread from lg); anonymous managers go back to their report. */
function BackLink() {
	const tc = useTranslations('common');
	const { isAnonymous } = useSession();
	return (
		<Button asChild variant="ghost" size="icon" className="-ml-2.5 lg:hidden">
			<Link href={isAnonymous ? '/m' : '/inbox'} aria-label={tc('back')}>
				<CaretLeftIcon weight="bold" aria-hidden="true" />
			</Link>
		</Button>
	);
}

function ThreadView({ conversation }: { conversation: Conversation }) {
	const { id } = conversation;
	const t = useTranslations('chat');
	const ta = useTranslations('abuse');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const store = useStore() as ApiStore;
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	const alias = useAlias();
	const title = useConversationTitle()(conversation);
	const { isAnonymous } = useSession();
	const online = useOnline();
	const { data, isLoading, isError, isFetching, refetch } = useListMessagesQuery({ id });
	const [sendMessage] = useSendMessageMutation();
	const [markRead] = useMarkConversationReadMutation();
	const [blockParticipant, { isLoading: blocking }] = useBlockParticipantMutation();
	const [older, setOlder] = React.useState<{ items: Message[]; cursor: string | null }>();
	const [loadingOlder, setLoadingOlder] = React.useState(false);
	const [pending, setPending] = React.useState<Pending[]>([]);
	// The queue mirrored in a ref, so a flush never reads a stale render; `flushing` keeps one sender at a time.
	const queue = React.useRef<Pending[]>([]);
	const flushing = React.useRef(false);
	const fetchingOlder = React.useRef(false);
	// Each submit or retry asks for one flush run (an effect, so it sees the queue as committed).
	const [flushes, setFlushes] = React.useState(0);
	const [sent, setSent] = React.useState<ReadonlySet<string>>(new Set());
	const [reported, setReported] = React.useState<ReadonlySet<string>>(new Set());
	const [lock, setLock] = React.useState<Lock>();
	const [abuse, setAbuse] = React.useState<Abuse>();
	const [abuseOpen, setAbuseOpen] = React.useState(false);
	const [blockOpen, setBlockOpen] = React.useState(false);
	const [draft, setDraft] = React.useState('');
	// "Danes" and "Včeraj" need no live clock: the time the page opened is enough.
	const [now] = React.useState(Date.now);
	const started = React.useRef(false);
	const seen = React.useRef<string>(undefined);
	// What the menu chose; it runs once the menu has closed and handed focus back to its button (as MoreMenu).
	const chosen = React.useRef<(() => void) | null>(null);
	const menuButton = React.useRef<HTMLButtonElement>(null);
	const scroller = React.useRef<HTMLDivElement>(null);
	const sentinel = React.useRef<HTMLDivElement>(null);
	const composer = React.useRef<HTMLTextAreaElement>(null);

	// Realtime (ADR-023): message.created lands in the cached page (merged by id, so an echo or a catch-up after a
	// reconnect never doubles a message); every (re)subscribe fetches what came while disconnected. supabase-js
	// rejoins with its own backoff. Left on unmount.
	React.useEffect(() => {
		let stop: (() => void) | undefined;
		let cancelled = false;
		void import('@/lib/supabase/client').then(({ createClient }) => {
			if (!cancelled) stop = subscribeConversation(createClient(), store, id);
		});
		return () => {
			cancelled = true;
			stop?.();
		};
	}, [store, id]);

	const latest = data?.items;
	// Older pages sit before the latest one; an id in both is shown once.
	const earlier = React.useMemo(() => {
		const ids = new Set(latest?.map((message) => message.id));
		return older?.items.filter((message) => !ids.has(message.id)) ?? [];
	}, [older, latest]);
	const isOwn = (message: Message) =>
		message.kind !== 'system' && message.sender_alias_key === conversation.my_alias_key;
	const authorOf = (message: Message) =>
		isOwn(message) ? t('alias_you') : alias(message.sender_alias_key, message.sender_display_name);
	const empty = ![...earlier, ...(latest ?? [])].some((message) => message.kind !== 'system') && !pending.length;

	// C9 read: on open, and whenever another person's message arrives while it is open.
	const last = latest?.at(-1);
	React.useEffect(() => {
		if (!last || last.id === seen.current) return;
		const first = seen.current === undefined;
		seen.current = last.id;
		if (first || last.kind === 'system' || last.sender_alias_key !== conversation.my_alias_key)
			void markRead({ id });
	}, [last, id, markRead, conversation.my_alias_key]);

	// A new conversation (no messages yet) opens with the composer focused (P12 variants).
	const loaded = !!latest;
	React.useEffect(() => {
		if (loaded && empty) composer.current?.focus();
	}, [loaded, empty]);

	const closed = conversation.status === 'read_only' || lock === 'read_only';
	const participant = conversation.other_participant_id;
	const block = participant
		? () =>
				blockParticipant({ id, body: { participant_id: participant } })
					.unwrap()
					.then(() => setLock('blocked_by_you'))
		: undefined;

	const change = (next: (items: Pending[]) => Pending[]) => {
		queue.current = next(queue.current);
		setPending(queue.current);
	};
	const update = (key: string, state?: Pending['state']) =>
		change((items) =>
			state
				? items.map((item) => (item.key === key ? { ...item, state } : item))
				: items.filter((item) => item.key !== key)
		);
	/** Sends one message; false stops the run (an error or a lock): the message stays, failed, for "Poskusi znova". */
	const deliver = async (item: Pending) => {
		update(item.key, 'sending');
		const first = ![...earlier, ...(latest ?? [])].some(isOwn);
		try {
			const message = await sendMessage({ id, body: { body: item.body }, idempotencyKey: item.key }).unwrap();
			update(item.key);
			setSent((ids) => new Set(ids).add(message.id));
			// C9/C12: the first message the user sends here; track() drops it without analytics consent.
			if (first && !started.current) {
				started.current = true;
				track('chat_started', { species: conversation.about_report.species });
			}
		} catch (error) {
			const code = codeOf(error);
			if (code === 'FORBIDDEN') setLock('blocked_you');
			else if (code === 'UNVERIFIED_EMAIL') setLock('unverified');
			else if (code === 'GONE') {
				setLock('read_only');
				dispatch(chatApi.util.invalidateTags(['Conversation']));
			} else toast.error(errorText(error));
			update(item.key, 'failed');
			return false;
		}
		return true;
	};
	// Queued messages go out one at a time, in order; the first failure stops the run. Nothing retries on its own.
	const flush = React.useEffectEvent(async () => {
		if (flushing.current) return;
		flushing.current = true;
		try {
			for (let item; (item = queue.current.find((m) => m.state === 'queued'));)
				if (!(await deliver(item))) {
					// Whatever waits behind the failure would show "sending" for good: failed too, each with its own retry.
					change((items) => items.map((m) => (m.state === 'queued' ? { ...m, state: 'failed' } : m)));
					break;
				}
		} finally {
			flushing.current = false;
		}
	});
	// A submit, a retry or coming back online (P12 offline: the queue sends on reconnect).
	React.useEffect(() => {
		if (online) void flush();
	}, [online, flushes]);

	const submit = () => {
		const body = draft.trim();
		if (!body || lock) return;
		setDraft('');
		// Always through the queue: behind anything queued, sending or failed, the new message goes out in order.
		change((items) => [...items, { key: crypto.randomUUID(), body, state: 'queued' }]);
		setFlushes((n) => n + 1);
		// The send button took focus; typing goes on in the field.
		composer.current?.focus();
		// The newest message is at the bottom (scrollTop 0 in the reversed scroller).
		if (scroller.current) scroller.current.scrollTop = 0;
	};
	const retry = (item: Pending) => {
		update(item.key, 'queued');
		setFlushes((n) => n + 1);
	};

	// Older pages load as the top of the thread scrolls into view (P12 "Loading older").
	const cursor = older ? older.cursor : data?.next_cursor;
	const loadOlder = React.useEffectEvent(async () => {
		if (!cursor || fetchingOlder.current) return;
		fetchingOlder.current = true;
		setLoadingOlder(true);
		const { data: page } = await dispatch(
			chatApi.endpoints.listMessages.initiate({ id, before: cursor }, { subscribe: false, forceRefetch: true })
		);
		fetchingOlder.current = false;
		setLoadingOlder(false);
		if (page)
			setOlder((current) => ({ items: [...page.items, ...(current?.items ?? [])], cursor: page.next_cursor }));
	});
	React.useEffect(() => {
		const target = sentinel.current;
		if (!cursor || !target || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadOlder(), {
			root: scroller.current,
			rootMargin: '200px 0px 0px 0px',
		});
		observer.observe(target);
		return () => observer.disconnect();
	}, [cursor, loaded]);

	const openAbuse = (next: Abuse) => {
		setAbuse(next);
		setAbuseOpen(true);
	};
	const confirmBlock = async () => {
		try {
			await block?.();
			setBlockOpen(false);
			toast.success(t('blocked_toast'));
		} catch (error) {
			toast.error(errorText(error));
		}
	};
	// "Prijavi zlorabo" in the menu reports the other person (C11 profile) once the API names them (CH-170); until then
	// their latest message, as on mobile.
	const lastOther = [...earlier, ...(latest ?? [])]
		.reverse()
		.find((m) => m.kind !== 'system' && !isOwn(m) && !reported.has(m.id));
	const personTarget: AbuseTarget | undefined = participant
		? { type: 'profile', id: participant }
		: lastOther && { type: 'message', id: lastOther.id };
	const canBlock = !!block && lock !== 'blocked_by_you';

	// Day separators in the Ljubljana calendar; pending messages are today's.
	const dayLabel = (at: string | number) => {
		const days = dayNumber(new Date(now)) - dayNumber(new Date(at));
		return days <= 0 ? t('day_today') : days === 1 ? t('day_yesterday') : formatDayMonth(at, locale, now);
	};
	const messageRow = (message: Message): Row => ({
		kind: 'message',
		key: message.id,
		at: message.created_at,
		message,
	});
	const [earlierRows = [], latestRows = [], pendingRows = []] = withDays([
		earlier.map(messageRow),
		(latest ?? []).map(messageRow),
		pending.map((item): Row => ({ kind: 'pending', key: item.key, at: now, pending: item })),
	]);
	const renderRow = (row: Row) => {
		if (row.kind === 'day')
			return (
				<p key={row.key} className="my-1.5 text-center text-sm font-bold text-muted-foreground">
					{dayLabel(row.at)}
				</p>
			);
		if (row.kind === 'pending')
			return (
				<PendingBubble
					key={row.key}
					pending={row.pending}
					// Queued while online only until the run reaches it.
					state={row.pending.state === 'queued' && online ? 'sending' : row.pending.state}
					onRetry={() => retry(row.pending)}
				/>
			);
		const { message } = row;
		if (message.kind === 'system')
			return (
				<p key={row.key} className="mx-auto my-2.5 max-w-[85%] text-center text-sm text-muted-foreground">
					{(SYSTEM as readonly string[]).includes(message.body)
						? t(`system_${message.body as (typeof SYSTEM)[number]}`)
						: message.body}
				</p>
			);
		if (reported.has(message.id))
			return (
				<div
					key={row.key}
					className="flex max-w-[80%] items-center gap-2.5 self-start rounded-row bg-muted px-4 py-2.5 text-control leading-[22px]"
				>
					<FlagIcon weight="bold" aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
					<p>{ta('message_folded')}</p>
				</div>
			);
		const own = isOwn(message);
		return (
			<Bubble
				key={row.key}
				message={message}
				own={own}
				author={authorOf(message)}
				time={formatDate(message.created_at, locale, 'time')}
				sent={sent.has(message.id)}
				onReport={
					own ? undefined : () => openAbuse({ target: { type: 'message', id: message.id }, block: false })
				}
			/>
		);
	};

	const headerTitle = conversation.about_report.thumb_url
		? title
		: alias(conversation.other_alias_key, conversation.other_display_name);

	return (
		<>
			{/* Top bar: back (below lg), pet photo 32, title, status word, the overflow menu. */}
			<div className="flex min-h-15 shrink-0 items-center gap-1 py-2 lg:gap-3">
				<BackLink />
				{conversation.about_report.thumb_url ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={conversation.about_report.thumb_url}
						alt=""
						width={32}
						height={32}
						className="size-8 shrink-0 rounded-full bg-muted object-cover"
					/>
				) : (
					<span
						aria-hidden="true"
						className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"
					>
						<UserIcon weight="fill" className="size-[18px]" />
					</span>
				)}
				<div className="ml-1 min-w-0 flex-1">
					<h1 className="truncate font-display text-lg leading-6 font-bold lg:text-xl lg:leading-7">
						{headerTitle}
					</h1>
					<StatusWord status={closed ? 'read_only' : conversation.status} />
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<Button ref={menuButton} variant="ghost" size="icon" aria-label={t('menu')}>
							<DotsThreeVerticalIcon weight="bold" aria-hidden="true" />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							align="end"
							sideOffset={4}
							aria-label={t('menu')}
							className="z-50 w-60 rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
							onCloseAutoFocus={() => {
								const action = chosen.current;
								chosen.current = null;
								action?.();
							}}
						>
							<DropdownMenu.Item asChild className={menuRowClass}>
								<Link
									href={{
										pathname: '/r/[code]',
										params: { code: conversation.about_report.short_code },
									}}
								>
									<PawPrintIcon weight="bold" aria-hidden="true" />
									{t('menu_open_report')}
								</Link>
							</DropdownMenu.Item>
							{personTarget && (
								<DropdownMenu.Item
									className={menuRowClass}
									onSelect={() =>
										(chosen.current = () => openAbuse({ target: personTarget, block: false }))
									}
								>
									<FlagIcon weight="bold" aria-hidden="true" />
									{t('menu_report')}
								</DropdownMenu.Item>
							)}
							{personTarget && canBlock && (
								<DropdownMenu.Item
									className={menuRowClass}
									onSelect={() =>
										(chosen.current = () => openAbuse({ target: personTarget, block: true }))
									}
								>
									<FlagIcon weight="bold" aria-hidden="true" />
									{ta('entry_block')}
								</DropdownMenu.Item>
							)}
							{canBlock && (
								<DropdownMenu.Item
									className={menuRowClass}
									onSelect={() => (chosen.current = () => setBlockOpen(true))}
								>
									<ProhibitIcon weight="bold" aria-hidden="true" />
									{t('menu_block')}
								</DropdownMenu.Item>
							)}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			<SafetyBanner />

			{isLoading ? (
				<div aria-busy="true" className="grid flex-1 content-end gap-3 py-4">
					<p role="status" className="sr-only">
						{tc('loading')}
					</p>
					<Skeleton className="h-11 w-3/5 rounded-[20px]" />
					<Skeleton className="h-11 w-2/5 justify-self-end rounded-[20px]" />
				</div>
			) : isError && !data ? (
				<div className="flex-1 pt-4">
					<InlineError onRetry={() => void refetch()} retrying={isFetching} />
				</div>
			) : (
				// Reversed column: the thread starts scrolled to the newest message and stays there as messages arrive.
				<div
					ref={scroller}
					tabIndex={0}
					role="region"
					aria-label={t('inbox_title')}
					className={cn('-mx-1 flex flex-1 flex-col-reverse overflow-y-auto px-1', ringClass)}
				>
					<div className="flex flex-col gap-1.5 py-3 lg:px-2">
						<div ref={sentinel} />
						{isAnonymous && (
							<AuthNote icon={KeyIcon} className="mb-2">
								{t('anon_session')}
							</AuthNote>
						)}
						{loadingOlder && (
							<p
								role="status"
								className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
							>
								<span aria-hidden="true" className={spinnerClass} />
								{t('loading_older')}
							</p>
						)}
						{/* Older pages stay out of the live region, so loading them is not read out. */}
						{earlierRows.map(renderRow)}
						<div role="log" aria-live="polite" className="flex flex-col gap-1.5">
							{latestRows.map(renderRow)}
						</div>
						{/* Outside the log: a sending message is not announced twice (here and once it is stored). */}
						{pendingRows.map(renderRow)}
						{empty && (
							<p className="mt-2 flex gap-2.5">
								<ChatTeardropTextIcon
									weight="bold"
									aria-hidden="true"
									className="mt-px size-[22px] shrink-0 text-primary"
								/>
								{t('empty_thread')}
							</p>
						)}
					</div>
				</div>
			)}

			{closed ? (
				<AuthNote icon={LockSimpleIcon} className="mb-4 shrink-0">
					{t('read_only')}
				</AuthNote>
			) : (
				<div className="shrink-0">
					{lock ? (
						<AuthNote icon={lock === 'unverified' ? EnvelopeSimpleIcon : ProhibitIcon} className="mb-3">
							{t(lock)}
						</AuthNote>
					) : (
						!online && (
							<AuthNote icon={WifiSlashIcon} className="mb-3">
								{t('offline')}
							</AuthNote>
						)
					)}
					<Composer ref={composer} value={draft} onChange={setDraft} onSend={submit} disabled={!!lock} />
				</div>
			)}

			{abuse && (
				<ReportAbuseDialog
					// A fresh form per target.
					key={`${abuse.target.id}-${abuse.block}`}
					target={abuse.target}
					open={abuseOpen}
					onOpenChange={setAbuseOpen}
					onBlock={block}
					defaultBlock={abuse.block}
					onSent={() => {
						if (abuse.target.type === 'message') setReported((ids) => new Set(ids).add(abuse.target.id));
					}}
					// A reported message folds and takes its button with it: focus goes to the composer or the thread.
					returnFocus={() =>
						composer.current && !composer.current.disabled ? composer.current : scroller.current
					}
				/>
			)}
			<AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
				<AlertDialogContent
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						menuButton.current?.focus();
					}}
				>
					<AlertDialogTitle>{t('block_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('block_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
						<Button variant="destructive" loading={blocking} onClick={() => void confirmBlock()}>
							{t('block_confirm')}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Toaster closeLabel={tc('close')} label={tc('toasts_label')} />
		</>
	);
}

/** Persistent, not dismissible (P12 §2): shield, one sentence, "Nasveti" opening the safety tips (P3). */
function SafetyBanner() {
	const t = useTranslations('chat');
	return (
		<div className="flex min-h-12 shrink-0 items-center gap-2 rounded-[16px] bg-secondary pr-1.5 pl-4 text-sm leading-5 font-semibold text-secondary-foreground">
			<ShieldCheckIcon weight="fill" aria-hidden="true" className="size-5 shrink-0 text-primary" />
			<p className="min-w-0 flex-1 py-1">{t('safety_banner')}</p>
			<Link
				href="/safety"
				className={cn(
					'inline-flex min-h-11 shrink-0 items-center rounded-xl px-2 font-bold underline underline-offset-3 hover:bg-foreground/10',
					ringClass
				)}
			>
				{t('safety_banner_link')}
			</Link>
		</div>
	);
}

/** 13 px muted line under a bubble: an icon and a word (sent, queued, sending) or the time. */
function Meta({ icon: MetaIcon, tone, children }: { icon?: Icon; tone?: string; children: React.ReactNode }) {
	return (
		<p className={metaClass}>
			{MetaIcon && <MetaIcon weight="bold" aria-hidden="true" className={cn('size-3.5', tone)} />}
			{children}
		</p>
	);
}

const bubbleClass = 'rounded-[20px] px-4 py-2.5 text-base leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]';

/**
 * Own (right, primary) or other (left, card) message, radius 20 with a 6 px tail corner. The body is plain text: links
 * are never linkified or previewed and get the caution line (C9). Another person's message has a report button, shown
 * on hover or focus where there is a pointer, always on touch.
 */
function Bubble({
	message,
	own,
	author,
	time,
	sent,
	onReport,
}: {
	message: Message;
	own: boolean;
	author: string;
	time: string;
	sent: boolean;
	onReport?: () => void;
}) {
	const t = useTranslations('chat');
	const ta = useTranslations('abuse');
	return (
		<div
			className={cn(
				'group flex max-w-[80%] flex-col gap-1 lg:max-w-[62%]',
				own ? 'items-end self-end' : 'items-start self-start'
			)}
		>
			<div className="flex items-center gap-1">
				<article
					aria-label={t('bubble_a11y', { author, time, text: message.body })}
					className={cn(
						bubbleClass,
						own
							? 'rounded-br-[6px] bg-primary text-primary-foreground'
							: 'rounded-bl-[6px] bg-card text-card-foreground'
					)}
				>
					<p>{message.body}</p>
				</article>
				{onReport && (
					<Button
						variant="ghost"
						size="icon"
						aria-label={ta('entry')}
						onClick={onReport}
						className="shrink-0 text-muted-foreground group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0"
					>
						<FlagIcon weight="bold" aria-hidden="true" className="size-5" />
					</Button>
				)}
			</div>
			{message.has_link && (
				<p className="flex gap-1.5 text-[13px] leading-[18px] text-muted-foreground">
					<WarningIcon weight="bold" aria-hidden="true" className="mt-px size-[15px] shrink-0" />
					{t('link_caution')}
				</p>
			)}
			{sent ? (
				<Meta icon={CheckIcon} tone="text-primary">
					{t('sent')}
				</Meta>
			) : (
				<time dateTime={message.created_at} className={metaClass}>
					{time}
				</time>
			)}
		</div>
	);
}

/** A message on its way: shown at once with a spinner, a clock while offline, or muted with "Poskusi znova". */
function PendingBubble({
	pending,
	state,
	onRetry,
}: {
	pending: Pending;
	state: Pending['state'];
	onRetry: () => void;
}) {
	const t = useTranslations('chat');
	const failed = state === 'failed';
	const status = failed ? t('failed') : state === 'queued' ? t('queued') : t('sending');
	return (
		<div className="flex max-w-[80%] flex-col items-end gap-1 self-end lg:max-w-[62%]">
			<article
				// "Vi, Ni poslano: …", as P12 names a bubble (author, state, text).
				aria-label={t('bubble_a11y', {
					author: t('alias_you'),
					time: status.replace(/[\s.…]+$/, ''),
					text: pending.body,
				})}
				className={cn(
					bubbleClass,
					'rounded-br-[6px]',
					failed ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
				)}
			>
				<p>{pending.body}</p>
			</article>
			{failed ? (
				<div role="alert" className="flex items-center gap-1 text-sm">
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="size-[18px] shrink-0 text-destructive"
					/>
					{t('failed')}
					<Button variant="text" size="sm" onClick={onRetry}>
						{t('retry')}
					</Button>
				</div>
			) : state === 'queued' ? (
				<Meta icon={ClockIcon}>{t('queued')}</Meta>
			) : (
				<p className={metaClass}>
					<span aria-hidden="true" className={spinnerClass} />
					{t('sending')}
				</p>
			)}
		</div>
	);
}

/**
 * Line-style field (17 px, grows to 4 lines) and the 48 px round send button, disabled while empty (P12 §4). Enter
 * sends, Shift+Enter adds a line (P12 web); the counter shows in the last 100 characters, read with the field.
 */
function Composer({
	ref,
	value,
	onChange,
	onSend,
	disabled,
}: {
	ref: React.Ref<HTMLTextAreaElement>;
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	disabled: boolean;
}) {
	const t = useTranslations('chat');
	const id = React.useId();
	const left = MAX - value.length;
	const canSend = !disabled && value.trim().length > 0;
	return (
		<form
			className="bg-background pt-2 pb-4"
			onSubmit={(event) => {
				event.preventDefault();
				onSend();
			}}
		>
			{left <= COUNTER_FROM && (
				<p
					id={`${id}-counter`}
					className="mr-[60px] text-right text-[13px] leading-4 text-muted-foreground tabular-nums"
				>
					{t('counter', { n: left })}
				</p>
			)}
			<div className="flex items-end gap-2">
				<label htmlFor={id} className="sr-only">
					{t('composer_label')}
				</label>
				<Textarea
					ref={ref}
					id={id}
					rows={1}
					value={value}
					maxLength={MAX}
					disabled={disabled}
					enterKeyHint="send"
					placeholder={t('composer_placeholder')}
					aria-describedby={left <= COUNTER_FROM ? `${id}-counter` : undefined}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
						event.preventDefault();
						onSend();
					}}
					className="field-sizing-content max-h-[120px] min-h-12 flex-1 pt-[11px] pb-[9px] text-control-lg leading-6"
				/>
				<Button
					type="submit"
					size="icon"
					aria-label={t('send')}
					disabled={!canSend}
					className="size-12 rounded-full"
				>
					<PaperPlaneTiltIcon weight="fill" aria-hidden="true" className="size-[22px]" />
				</Button>
			</div>
		</form>
	);
}
