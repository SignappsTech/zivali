import { addNetworkStateListener } from 'expo-network';
import { type Href, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { ChatTeardropTextIcon } from 'phosphor-react-native/src/icons/ChatTeardropText';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { DotsThreeVerticalIcon } from 'phosphor-react-native/src/icons/DotsThreeVertical';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { FlagIcon } from 'phosphor-react-native/src/icons/Flag';
import { KeyIcon } from 'phosphor-react-native/src/icons/Key';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { PaperPlaneTiltIcon } from 'phosphor-react-native/src/icons/PaperPlaneTilt';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { ProhibitIcon } from 'phosphor-react-native/src/icons/Prohibit';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import {
	AccessibilityInfo,
	ActivityIndicator,
	FlatList,
	Image,
	KeyboardAvoidingView,
	Pressable,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useStore } from 'react-redux';
import { useLocale, useTranslations } from 'use-intl';

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
import { ReportAbuse } from '@/components/abuse/report-abuse';
import { useErrorText } from '@/components/auth/parts';
import { type Conversation, StatusWord, useAlias, useConversationTitle } from '@/components/chat/conversations';
import { InlineError } from '@/components/notifications/notifications-view';
import { Note } from '@/components/report/parts';
import { MenuItem } from '@/components/report/slots/slot-c';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { isOnline, useNetworkState } from '@/lib/net';
import { day } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// P12 thread (C9). Nothing of the conversation is written to the device (C17): messages, the send queue and the
// reported ids live in memory only, so an offline queue is lost when the app closes. No ad component here (C15).

/** C9: body 1–2000 characters; the counter shows in the last 100 (P12 copy). */
const MAX = 2000;
const COUNTER_FROM = 100;
/** System message bodies the client words itself (P12 copy §5); any other body is shown as sent. */
const SYSTEM = ['confirmed', 'contact', 'closed', 'home', 'reopened'] as const;

type Pending = { key: string; body: string; state: 'sending' | 'queued' | 'failed' };
/** Why the composer is off: read-only replaces it; the others disable it with their sentence (P12 M6, M9). */
type Lock = 'read_only' | 'blocked_by_you' | 'blocked_you' | 'unverified';
type SheetMode = 'menu' | 'block' | { report: Uuid; block: boolean };
type Row =
	| { kind: 'day'; key: string; label: string }
	| { kind: 'message'; key: string; message: Message }
	| { kind: 'pending'; key: string; pending: Pending };

const codeOf = (error: unknown) =>
	error instanceof ApiError ? error.code : (error as Partial<QueryError> | null)?.data?.code;

/** Conversation screen: the C9 summary (header, own alias, status) comes from the inbox list. */
export function Thread({ id }: { id: Uuid }) {
	const tc = useTranslations('common');
	const { data, isError, isFetching, refetch } = useListConversationsQuery();
	const conversation = data?.items.find((item) => item.id === id);
	if (conversation) return <ThreadView conversation={conversation} />;
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="min-h-14 flex-row items-center px-1">
				<BackButton />
			</View>
			{data || isError ? (
				<InlineError className="mx-5 mt-5" retrying={isFetching} onRetry={() => void refetch()} />
			) : (
				<ActivityIndicator aria-label={tc('loading')} size="large" className="mt-10 text-primary" />
			)}
		</SafeAreaView>
	);
}

function BackButton() {
	const t = useTranslations('common');
	const router = useRouter();
	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={t('back')}
			onPress={() => (router.canGoBack() ? router.back() : router.replace('/inbox' as Href))}
		>
			<Icon as={CaretLeftIcon} size={24} />
		</Button>
	);
}

function ThreadView({ conversation }: { conversation: Conversation }) {
	const { id } = conversation;
	const t = useTranslations('chat');
	const ta = useTranslations('abuse');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const router = useRouter();
	const store = useStore() as Pick<ApiStore, 'dispatch' | 'getState'>;
	const dispatch = useDispatch<ApiStore['dispatch']>();
	const errorText = useErrorText();
	const alias = useAlias();
	const title = useConversationTitle()(conversation);
	const { isAnonymous } = useSession();
	const online = isOnline(useNetworkState());
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
	const [sent, setSent] = React.useState<ReadonlySet<string>>(new Set());
	const [reported, setReported] = React.useState<ReadonlySet<string>>(new Set());
	const [lock, setLock] = React.useState<Lock>();
	const [sheet, setSheet] = React.useState<SheetMode>();
	const [draft, setDraft] = React.useState('');
	// "Danes" and "Včeraj" need no live clock: the time the screen opened is enough.
	const [now] = React.useState(Date.now);
	const started = React.useRef(false);
	const seen = React.useRef<string>(undefined);

	// message.created lands in the cached page; every (re)subscribe fetches what came while disconnected.
	React.useEffect(() => subscribeConversation(supabase, store, id), [store, id]);

	const messages = React.useMemo(() => [...(older?.items ?? []), ...(data?.items ?? [])], [older, data]);
	const isOwn = (message: Message) =>
		message.kind !== 'system' && message.sender_alias_key === conversation.my_alias_key;
	const authorOf = (message: Message) =>
		isOwn(message) ? t('alias_you') : alias(message.sender_alias_key, message.sender_display_name);

	// Read while open: each newest message marks the conversation read; others' messages are announced politely.
	const last = data?.items.at(-1);
	React.useEffect(() => {
		if (!last || last.id === seen.current) return;
		const first = seen.current === undefined;
		seen.current = last.id;
		void markRead({ id });
		if (!first && last.kind !== 'system' && last.sender_alias_key !== conversation.my_alias_key)
			AccessibilityInfo.announceForAccessibility(
				t('new_message_announce', { author: alias(last.sender_alias_key, last.sender_display_name) })
			);
	}, [last, id, markRead, conversation.my_alias_key, t, alias]);

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
	/** Sends one message; false means stop the queue (connection error or lock), the message stays for a retry. */
	const deliver = async (item: Pending) => {
		update(item.key, 'sending');
		const first = !messages.some(isOwn);
		try {
			const message = await sendMessage({ id, body: { body: item.body } }).unwrap();
			update(item.key);
			setSent((ids) => new Set(ids).add(message.id));
			// C9/C12: the first message the user sends here; track() is a no-op without analytics consent.
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
	// Queued messages go out one at a time, in order; the first failure stops the run.
	const flush = React.useEffectEvent(async () => {
		if (flushing.current) return;
		flushing.current = true;
		try {
			for (let item; (item = queue.current.find((m) => m.state === 'queued'));) if (!(await deliver(item))) break;
		} finally {
			flushing.current = false;
		}
	});
	React.useEffect(() => {
		const network = addNetworkStateListener((state) => {
			if (isOnline(state)) void flush();
		});
		return () => network.remove();
	}, []);

	const submit = () => {
		const body = draft.trim();
		if (!body) return;
		setDraft('');
		// Always through the queue: behind anything queued, sending or failed, the new message goes out in order.
		const item: Pending = { key: `${Date.now()}-${queue.current.length}-${body.length}`, body, state: 'queued' };
		change((items) => [...items, item]);
		if (online) void flush();
	};
	const retry = (item: Pending) => {
		update(item.key, 'queued');
		void flush();
	};

	const loadOlder = async () => {
		const before = older ? older.cursor : data?.next_cursor;
		if (!before || loadingOlder) return;
		setLoadingOlder(true);
		const { data: page } = await dispatch(
			chatApi.endpoints.listMessages.initiate({ id, before }, { subscribe: false, forceRefetch: true })
		);
		setLoadingOlder(false);
		if (page)
			setOlder((current) => ({ items: [...page.items, ...(current?.items ?? [])], cursor: page.next_cursor }));
	};

	const close = () => setSheet(undefined);
	const confirmBlock = async () => {
		try {
			await block?.();
			close();
			toast.success(t('blocked_toast'));
		} catch (error) {
			toast.error(errorText(error));
		}
	};
	const report = (message: Message) => setSheet({ report: message.id, block: false });
	// The header's "Prijavi zlorabo" reports the other person's latest message (C11 targets a message, not a user).
	const target = [...messages].reverse().find((m) => m.kind !== 'system' && !isOwn(m) && !reported.has(m.id));

	// Day separators in the Ljubljana calendar; pending messages are today's.
	const dayLabel = (at: string | number) => {
		const days = day(now) - day(at);
		return days <= 0 ? t('day_today') : days === 1 ? t('day_yesterday') : formatDayMonth(at, locale, now);
	};
	const rows: Row[] = [];
	let lastDay: number | undefined;
	const separate = (at: string | number) => {
		if (day(at) === lastDay) return;
		lastDay = day(at);
		rows.push({ kind: 'day', key: `day-${lastDay}`, label: dayLabel(at) });
	};
	for (const message of messages) {
		separate(message.created_at);
		rows.push({ kind: 'message', key: message.id, message });
	}
	for (const item of pending) {
		separate(now);
		rows.push({ kind: 'pending', key: item.key, pending: item });
	}
	const empty = !messages.some((message) => message.kind !== 'system') && !pending.length;

	const renderRow = ({ item: row }: { item: Row }) => {
		if (row.kind === 'day')
			return <Text className="my-1.5 self-center font-sans-bold text-sm text-muted-foreground">{row.label}</Text>;
		if (row.kind === 'pending') return <PendingBubble pending={row.pending} onRetry={() => retry(row.pending)} />;
		const { message } = row;
		if (message.kind === 'system')
			return (
				<Text className="my-2.5 max-w-[85%] self-center text-center text-sm text-muted-foreground">
					{(SYSTEM as readonly string[]).includes(message.body)
						? t(`system_${message.body as (typeof SYSTEM)[number]}`)
						: message.body}
				</Text>
			);
		if (reported.has(message.id))
			return (
				<View
					accessible
					className="max-w-[80%] flex-row items-center gap-2.5 self-start rounded-[20px] bg-muted px-4 py-2.5"
				>
					<Icon as={FlagIcon} size={18} className="text-muted-foreground" />
					<Text className="min-w-0 shrink text-control leading-[22px]">{ta('message_folded')}</Text>
				</View>
			);
		const own = isOwn(message);
		return (
			<Bubble
				message={message}
				own={own}
				author={authorOf(message)}
				time={formatDate(message.created_at, locale, 'time')}
				sent={sent.has(message.id)}
				onReport={own ? undefined : () => report(message)}
			/>
		);
	};

	return (
		<Sheet open={!!sheet} onOpenChange={(open) => setSheet(open ? 'menu' : undefined)}>
			<SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
				<KeyboardAvoidingView behavior="padding" className="flex-1">
					<View className="min-h-14 flex-row items-center gap-1 px-1">
						<BackButton />
						{conversation.about_report.thumb_url ? (
							<Image
								source={{ uri: conversation.about_report.thumb_url }}
								alt=""
								aria-hidden
								className="size-8 rounded-full bg-muted"
							/>
						) : (
							<View aria-hidden className="size-8 items-center justify-center rounded-full bg-secondary">
								<Icon as={UserIcon} weight="fill" size={18} className="text-secondary-foreground" />
							</View>
						)}
						<View className="ml-1 min-w-0 flex-1">
							{/* With no pet photo, the header names the other person by their alias (P12 M7). */}
							<Text role="heading" numberOfLines={1} className="font-display text-lg leading-6">
								{conversation.about_report.thumb_url
									? title
									: alias(conversation.other_alias_key, conversation.other_display_name)}
							</Text>
							<StatusWord conversation={{ status: closed ? 'read_only' : conversation.status }} />
						</View>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon" aria-label={t('menu')}>
								<Icon as={DotsThreeVerticalIcon} size={24} />
							</Button>
						</SheetTrigger>
					</View>
					<SafetyBanner />
					{isLoading ? (
						<View className="flex-1 items-center justify-center">
							<ActivityIndicator aria-label={tc('loading')} size="large" className="text-primary" />
						</View>
					) : isError && !data ? (
						<View className="flex-1">
							<InlineError className="mx-4 mt-4" retrying={isFetching} onRetry={() => void refetch()} />
						</View>
					) : (
						<FlatList
							inverted
							data={[...rows].reverse()}
							keyExtractor={(row) => row.key}
							renderItem={renderRow}
							onEndReached={() => void loadOlder()}
							onEndReachedThreshold={0.2}
							className="flex-1"
							contentContainerClassName="gap-1.5 px-4 py-3"
							keyboardShouldPersistTaps="handled"
							// Inverted: the footer is the top of the thread, the header its bottom.
							ListFooterComponent={
								<View className="gap-2 pb-2">
									{isAnonymous ? <Note icon={KeyIcon}>{t('anon_session')}</Note> : null}
									{loadingOlder ? (
										<View role="status" className="flex-row items-center justify-center gap-2">
											<ActivityIndicator size="small" className="text-primary" />
											<Text className="text-sm text-muted-foreground">{t('loading_older')}</Text>
										</View>
									) : null}
								</View>
							}
							ListHeaderComponent={
								empty ? (
									<View className="mt-2 flex-row gap-2.5">
										<Icon as={ChatTeardropTextIcon} size={22} className="mt-0.5 text-primary" />
										<Text className="min-w-0 flex-1">{t('empty_thread')}</Text>
									</View>
								) : null
							}
						/>
					)}
					{closed ? (
						<Note icon={LockSimpleIcon} role="status" className="mx-4 mb-3">
							{t('read_only')}
						</Note>
					) : (
						<>
							{lock ? (
								<Note
									icon={lock === 'unverified' ? EnvelopeSimpleIcon : ProhibitIcon}
									role="status"
									className="mx-4 mb-3"
								>
									{t(lock)}
								</Note>
							) : !online ? (
								<Note icon={WifiSlashIcon} role="status" className="mx-4 mb-3">
									{t('offline')}
								</Note>
							) : null}
							<Composer
								value={draft}
								onChange={setDraft}
								onSend={submit}
								disabled={!!lock}
								autoFocus={empty && !isLoading}
							/>
						</>
					)}
				</KeyboardAvoidingView>
			</SafeAreaView>
			<SheetContent closeLabel={tc('close')}>
				{typeof sheet === 'object' ? (
					<ReportAbuse
						target={{ type: 'message', id: sheet.report }}
						offline={!online}
						onBlock={block}
						defaultBlock={sheet.block}
						onSent={() => setReported((ids) => new Set(ids).add(sheet.report))}
						onClose={close}
					/>
				) : sheet === 'block' ? (
					<>
						<SheetTitle>{t('block_title')}</SheetTitle>
						<SheetDescription className="text-lg text-foreground">{t('block_body')}</SheetDescription>
						<View className="mt-6 gap-1">
							<Button
								variant="destructive"
								size="lg"
								loading={blocking}
								onPress={() => void confirmBlock()}
							>
								{t('block_confirm')}
							</Button>
							<Button variant="text" onPress={close}>
								{tc('cancel')}
							</Button>
						</View>
					</>
				) : (
					<>
						<SheetTitle>{t('menu')}</SheetTitle>
						<View role="menu" aria-label={t('menu')} className="-mx-2 gap-1 pt-3">
							<MenuItem
								icon={PawPrintIcon}
								label={t('menu_open_report')}
								onPress={() => {
									close();
									router.push(`/r/${conversation.about_report.short_code}` as Href);
								}}
							/>
							{target ? (
								<MenuItem icon={FlagIcon} label={t('menu_report')} onPress={() => report(target)} />
							) : null}
							{target && block && lock !== 'blocked_by_you' ? (
								<MenuItem
									icon={FlagIcon}
									label={ta('entry_block')}
									onPress={() => setSheet({ report: target.id, block: true })}
								/>
							) : null}
							{block && lock !== 'blocked_by_you' ? (
								<MenuItem
									icon={ProhibitIcon}
									label={t('menu_block')}
									onPress={() => setSheet('block')}
								/>
							) : null}
						</View>
						<Button variant="text" className="mt-3" onPress={close}>
							{tc('cancel')}
						</Button>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

/** Persistent, not dismissible (P12 §2): shield, one sentence, "Nasveti" opening the safety tips (P3) on the web. */
function SafetyBanner() {
	const t = useTranslations('chat');
	const locale = useLocale();
	const tips = `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en/safety' : '/varnost'}`;
	return (
		<View className="min-h-12 flex-row items-center gap-2 bg-secondary pl-4 pr-1.5">
			<Icon as={ShieldCheckIcon} weight="fill" size={20} className="text-primary" />
			<Text className="min-w-0 flex-1 py-1 font-sans-semibold text-sm text-secondary-foreground">
				{t('safety_banner')}
			</Text>
			<Button
				variant="text"
				size="sm"
				className="px-2"
				onPress={() => void WebBrowser.openBrowserAsync(tips).catch(() => undefined)}
			>
				<Text className="font-sans-bold text-sm text-secondary-foreground underline">
					{t('safety_banner_link')}
				</Text>
			</Button>
		</View>
	);
}

/** 13 px muted line under a bubble: an icon and a word (sent, queued) or the time. */
function Meta({ icon, iconClassName, children }: { icon?: PhosphorIcon; iconClassName?: string; children: string }) {
	return (
		<View className="flex-row items-center gap-1">
			{icon ? <Icon as={icon} size={14} className={cn('text-muted-foreground', iconClassName)} /> : null}
			<Text className="text-xs text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
				{children}
			</Text>
		</View>
	);
}

/**
 * Own (right, primary) or other (left, card) message, radius 20 with a 6 px tail corner. The body is plain text: links
 * are never linkified or previewed and get the caution line (C9). Long press reports another person's message (P10);
 * screen readers get the same as a custom action.
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
		<View className={cn('max-w-[80%] gap-1', own ? 'items-end self-end' : 'items-start self-start')}>
			<Pressable
				accessible
				aria-label={t('bubble_a11y', { author, time, text: message.body })}
				onLongPress={onReport}
				accessibilityActions={onReport ? [{ name: 'longpress', label: ta('entry') }] : undefined}
				onAccessibilityAction={onReport}
				className={cn(
					'rounded-[20px] px-4 py-2.5',
					own ? 'rounded-br-[6px] bg-primary' : 'rounded-bl-[6px] bg-card'
				)}
			>
				<Text className={own ? 'text-primary-foreground' : 'text-card-foreground'}>{message.body}</Text>
			</Pressable>
			{message.has_link ? (
				<View className="flex-row gap-1.5">
					<Icon as={WarningIcon} size={15} className="mt-px text-muted-foreground" />
					<Text className="shrink text-xs text-muted-foreground">{t('link_caution')}</Text>
				</View>
			) : null}
			{sent ? (
				<Meta icon={CheckIcon} iconClassName="text-primary">
					{t('sent')}
				</Meta>
			) : (
				<Meta>{time}</Meta>
			)}
		</View>
	);
}

/** A message on its way: shown at once with a spinner, a clock while offline, or muted with "Poskusi znova". */
function PendingBubble({ pending, onRetry }: { pending: Pending; onRetry: () => void }) {
	const t = useTranslations('chat');
	const failed = pending.state === 'failed';
	const status = failed ? t('failed') : pending.state === 'queued' ? t('queued') : t('sending');
	return (
		<View className="max-w-[80%] items-end gap-1 self-end">
			<View
				accessible
				// "Vi, Ni poslano: …", as P12 names a bubble (author, state, text).
				aria-label={t('bubble_a11y', {
					author: t('alias_you'),
					time: status.replace(/[\s.…]+$/, ''),
					text: pending.body,
				})}
				className={cn('rounded-[20px] rounded-br-[6px] px-4 py-2.5', failed ? 'bg-muted' : 'bg-primary')}
			>
				<Text className={failed ? 'text-foreground' : 'text-primary-foreground'}>{pending.body}</Text>
			</View>
			{failed ? (
				<View role="alert" className="flex-row items-center gap-1">
					<Icon as={WarningCircleIcon} weight="fill" size={18} className="text-destructive" />
					<Text className="text-sm">{t('failed')}</Text>
					<Button variant="text" size="sm" className="px-2" onPress={onRetry}>
						{t('retry')}
					</Button>
				</View>
			) : pending.state === 'queued' ? (
				<Meta icon={ClockIcon}>{t('queued')}</Meta>
			) : (
				<View className="flex-row items-center gap-1">
					<ActivityIndicator
						size="small"
						className="text-muted-foreground"
						style={{ transform: [{ scale: 0.6 }] }}
					/>
					<Meta>{t('sending')}</Meta>
				</View>
			)}
		</View>
	);
}

/** Line-style field (17 px, grows to 4 lines) and the 48 px round send button, disabled while empty (P12 §4). */
function Composer({
	value,
	onChange,
	onSend,
	disabled,
	autoFocus,
}: {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	disabled: boolean;
	autoFocus: boolean;
}) {
	const t = useTranslations('chat');
	const left = MAX - value.length;
	const canSend = !disabled && value.trim().length > 0;
	return (
		<View className="bg-background pb-2 pl-4 pr-3 pt-2">
			{left <= COUNTER_FROM ? (
				<Text aria-live="polite" className="mr-[60px] text-right text-xs text-muted-foreground">
					{t('counter', { n: left })}
				</Text>
			) : null}
			<View className="flex-row items-end gap-2">
				<View className="min-w-0 flex-1">
					<Input
						multiline
						value={value}
						onChangeText={onChange}
						maxLength={MAX}
						editable={!disabled}
						autoFocus={autoFocus}
						aria-label={t('composer_label')}
						placeholder={t('composer_placeholder')}
						className="max-h-[116px] min-h-12 text-control-lg leading-6"
					/>
				</View>
				<Button size="icon" className="size-12" aria-label={t('send')} disabled={!canSend} onPress={onSend}>
					<Icon as={PaperPlaneTiltIcon} weight="fill" size={22} />
				</Button>
			</View>
		</View>
	);
}
