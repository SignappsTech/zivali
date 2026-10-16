import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { addNetworkStateListener } from 'expo-network';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HourglassMediumIcon } from 'phosphor-react-native/src/icons/HourglassMedium';
import { LinkBreakIcon } from 'phosphor-react-native/src/icons/LinkBreak';
import { LockSimpleIcon } from 'phosphor-react-native/src/icons/LockSimple';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useListConversationsQuery } from '@zivali/api/chat';
import { ApiError, type ErrorCode } from '@zivali/api/client';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useGetReportQuery, useTransitionReportMutation } from '@zivali/api/reports';
import type { QueryError } from '@zivali/api/rtk';
import type { ReportOwnerView, ReportTransitionAction } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { Spot } from '@/components/shell/parts';
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
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { statusIcons } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import { claimManageLink } from '@/lib/anonymous';
import { isOnline } from '@/lib/net';

// P7 manage page (C7 step 5, C15 `m`): `/m#<token>` from a universal link or zivali://m#<token>. No ad component here.

const DAY = 86_400_000;
/** C7: a failed claim (offline, captcha, server) is tried again every 60 s and as soon as the network is back. */
const RETRY_MS = 60_000;
/** Found and sighted reports expire after 30 idle days (C4); the note shows from day 25. */
const EXPIRY_DAYS = 30;
const NOTICE_DAYS = 5;
/** Reopen is possible within 7 days of closing (C4). */
const REOPEN_DAYS = 7;

type Claim =
	| { state: 'claiming' }
	| { state: 'retrying'; error: ApiError }
	| { state: 'invalid' }
	| { state: 'limited' }
	| { state: 'claimed'; code: string };

/** Unknown, closed or malformed tokens: the link is dead, trying again cannot help. */
const DEAD_LINK: readonly ErrorCode[] = ['NOT_FOUND', 'GONE', 'VALIDATION', 'FORBIDDEN'];

function useClaim(token: string | undefined) {
	const [claim, setClaim] = React.useState<Claim>(token ? { state: 'claiming' } : { state: 'invalid' });
	const retry = React.useRef(() => {});

	React.useEffect(() => {
		if (!token) return;
		let active = true;
		let busy = false;
		let waiting = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const attempt = async () => {
			if (busy) return;
			busy = true;
			waiting = false;
			clearTimeout(timer);
			setClaim({ state: 'claiming' });
			try {
				const { short_code } = await claimManageLink(token);
				if (active) setClaim({ state: 'claimed', code: short_code });
			} catch (cause) {
				if (!active) return;
				const error = cause instanceof ApiError ? cause : new ApiError('INTERNAL', 'claim failed', { cause });
				if (DEAD_LINK.includes(error.code)) setClaim({ state: 'invalid' });
				else if (error.code === 'RATE_LIMITED') setClaim({ state: 'limited' });
				else {
					setClaim({ state: 'retrying', error });
					waiting = true;
					timer = setTimeout(attempt, RETRY_MS);
				}
			} finally {
				busy = false;
			}
		};
		retry.current = attempt;
		void attempt();
		const network = addNetworkStateListener((state) => {
			if (waiting && isOnline(state)) void attempt();
		});
		return () => {
			active = false;
			clearTimeout(timer);
			network.remove();
		};
	}, [token]);

	return { claim, retry: () => retry.current() };
}

export default function ManageScreen() {
	// Expo Router hands the URL fragment over as the `#` param; the token never leaves the device in a URL.
	const { '#': token } = useLocalSearchParams<{ '#'?: string }>();
	const { claim, retry } = useClaim(token || undefined);
	return (
		<SafeAreaView className="flex-1 bg-background">
			<TopBar />
			{claim.state === 'claimed' ? (
				<ManageReport code={claim.code} />
			) : (
				<ClaimState claim={claim} retry={retry} />
			)}
		</SafeAreaView>
	);
}

function TopBar() {
	const t = useTranslations('common');
	const router = useRouter();
	return (
		<View className="h-14 flex-row items-center px-2">
			<Button
				variant="ghost"
				size="icon"
				aria-label={t('back')}
				onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
			>
				<Icon as={CaretLeftIcon} size={24} />
			</Button>
		</View>
	);
}

function Loading() {
	const t = useTranslations('common');
	return (
		<View className="flex-1 items-center justify-center">
			<ActivityIndicator aria-label={t('loading')} className="text-primary" size="large" />
		</View>
	);
}

/** Single-message screens (P16 pattern): spot icon, h1, one sentence, one action. */
function Message({
	icon,
	title,
	body,
	action,
}: {
	icon: PhosphorIcon;
	title: string;
	body: string;
	action?: React.ReactNode;
}) {
	return (
		<ScrollView contentContainerClassName="grow justify-center px-5 pb-8">
			<Spot icon={icon} />
			<Text role="heading" className="mt-8 font-display text-3xl tracking-[-0.6px]">
				{title}
			</Text>
			<Text className="mt-3 text-lg">{body}</Text>
			{action ? <View className="mt-6">{action}</View> : null}
		</ScrollView>
	);
}

function ClaimState({ claim, retry }: { claim: Exclude<Claim, { state: 'claimed' }>; retry: () => void }) {
	const t = useTranslations();
	const errorText = useErrorText();
	const router = useRouter();
	if (claim.state === 'claiming') return <Loading />;
	if (claim.state === 'invalid')
		return (
			<Message
				icon={LinkBreakIcon}
				title={t('report_found.link_invalid_title')}
				body={t('report_found.link_invalid_body')}
				action={
					<Button size="lg" onPress={() => router.replace('/')}>
						{t('common.go_to_map')}
					</Button>
				}
			/>
		);
	if (claim.state === 'limited')
		return (
			<Message
				icon={HourglassMediumIcon}
				title={t('report_found.manage_title')}
				body={errorText(new ApiError('RATE_LIMITED', ''))}
			/>
		);
	const offline = claim.error.code === 'NETWORK';
	return (
		<Message
			icon={offline ? WifiSlashIcon : ClockIcon}
			title={offline ? t('errors.offline_title') : t('report_found.manage_title')}
			body={offline ? t('errors.offline_body') : errorText(claim.error)}
			action={
				<Button variant="secondary" onPress={retry}>
					{t('common.try_again')}
				</Button>
			}
		/>
	);
}

function ManageReport({ code }: { code: string }) {
	const t = useTranslations('common');
	const { data, isLoading, isError, refetch } = useGetReportQuery({ code });
	if (isLoading) return <Loading />;
	if (isError || !data || !('manager_role' in data))
		return (
			<View className="px-5 pt-6">
				<Text>{t('inline_error')}</Text>
				<Button variant="secondary" className="mt-4 self-start" onPress={() => void refetch()}>
					{t('inline_error_retry')}
				</Button>
			</View>
		);
	return <ManageView report={data} />;
}

/** RTK Query errors carry the C1 code in `data` (rtk.ts); as an ApiError they get the shared errors.* sentence. */
const asApiError = (error: unknown) =>
	new ApiError(((error as Partial<QueryError>).data?.code ?? 'INTERNAL') as ErrorCode, 'request failed');

function ManageView({ report }: { report: ReportOwnerView }) {
	const t = useTranslations('report_found');
	const tl = useTranslations('lifecycle');
	const tc = useTranslations('common');
	const tr = useTranslations('report');
	const router = useRouter();
	const errorText = useErrorText();
	const [transition, { isLoading: busy }] = useTransitionReportMutation();
	const { data: conversations } = useListConversationsQuery();
	const { data: place } = useReversePlaceQuery({ lat: report.area.lat, lng: report.area.lng });
	const [confirmReturned, setConfirmReturned] = React.useState(false);
	const [thanked, setThanked] = React.useState(false);

	/** Resolves whether it worked; a failure is a toast and the page stays as it was. */
	const act = (action: ReportTransitionAction) =>
		transition({ code: report.short_code, body: { action } })
			.unwrap()
			.then(
				() => true,
				(error: unknown) => {
					toast.error(errorText(asApiError(error)));
					return false;
				}
			);
	const markReturned = async () => {
		if (await act('mark_reunited')) setThanked(true);
	};

	const threads = conversations?.items.filter((c) => c.about_report.short_code === report.short_code) ?? [];
	const unread = threads.reduce((sum, c) => sum + c.unread, 0);
	// The inbox lists the conversations of every report this session manages (P12).
	const openMessages = () => router.push('/inbox' as Href);

	// Day counts need no live clock: the time the screen opened is enough.
	const [now] = React.useState(Date.now);
	const closedAt = report.closed_at ?? report.reunited_at;
	const closed = report.status === 'closed' || report.status === 'reunited';
	const canReopen = closed && closedAt !== null && now - Date.parse(closedAt) < REOPEN_DAYS * DAY;
	const underReview = report.moderation_state === 'held' || report.moderation_state === 'hidden';
	const idleSince = Date.parse(report.last_owner_update_at ?? report.created_at);
	const daysLeft = EXPIRY_DAYS - Math.floor((now - idleSince) / DAY);
	const expiring = !closed && daysLeft >= 1 && daysLeft <= NOTICE_DAYS;
	const photo = report.photos[0];

	// P14 §5: the finder's thank-you after "Žival je spet doma".
	if (thanked)
		return (
			<Message
				icon={HeartIcon}
				title={tl('finder_thanks_title')}
				body={tl('finder_thanks_body')}
				action={
					<Button size="lg" onPress={() => router.replace('/')}>
						{tc('go_to_map')}
					</Button>
				}
			/>
		);

	return (
		<ScrollView contentContainerClassName="px-5 pb-11 pt-2">
			{photo ? (
				<Image
					source={{ uri: photo.url }}
					alt={photo.alt}
					className="aspect-[4/3] w-full rounded-[32px] bg-muted"
				/>
			) : null}
			<Badge variant={report.type} className="mt-5">
				<Icon as={statusIcons[report.type]} weight="fill" size={17} />
				{t(report.type === 'sighted' ? 'status_sighted' : 'status_found')}
			</Badge>
			<Text role="heading" className="mt-3 font-display text-3xl tracking-[-0.6px]">
				{t('manage_title')}
			</Text>

			<View className="mt-6 gap-5">
				<Fact label={t('summary_animal')} value={t(`species_${report.species}`)} />
				{place ? <Fact label={t('summary_place')} value={place.label} /> : null}
				<Fact
					label={t('summary_situation')}
					value={t(report.type === 'found' ? 'summary_with_me' : 'summary_not_with_me')}
				/>
			</View>
			<View className="mt-6 flex-row gap-2">
				<Icon as={LockSimpleIcon} weight="fill" size={16} className="mt-0.5 text-primary" />
				<Text className="flex-1 text-sm text-muted-foreground">{t('manage_private_note')}</Text>
			</View>

			{threads.length > 0 ? (
				<>
					<Text role="heading" className="mt-10 font-display text-2xl tracking-[-0.36px]">
						{t('manage_messages')}
					</Text>
					{unread > 0 ? (
						<View className="mt-2 flex-row items-center gap-2">
							<Icon as={ChatCircleIcon} weight="bold" size={20} className="text-primary" />
							<Text className="font-sans-bold">{t('manage_unread', { count: unread })}</Text>
						</View>
					) : null}
					<Button size="lg" className="mt-4" onPress={openMessages}>
						{t('manage_open_messages')}
					</Button>
				</>
			) : null}

			{closed ? (
				<Note icon={CheckCircleIcon} text={t('closed_note')}>
					{canReopen ? (
						<Button variant="secondary" size="sm" loading={busy} onPress={() => void act('reopen')}>
							{t('reopen')}
						</Button>
					) : null}
				</Note>
			) : underReview ? (
				<Note icon={HourglassMediumIcon} title={t('under_review_title')} text={t('under_review_body')} />
			) : expiring ? (
				<Note icon={ClockIcon} text={t('expiry_note', { days: daysLeft })}>
					<Button variant="secondary" size="sm" loading={busy} onPress={() => void act('extend')}>
						{t('extend')}
					</Button>
				</Note>
			) : null}

			{report.status === 'open' || report.status === 'matched' ? (
				<Button
					variant="secondary"
					className="mt-8 self-start"
					onPress={() => router.push(`/r/${report.short_code}/edit` as Href)}
				>
					{tr('owner_edit')}
				</Button>
			) : null}

			{/* Closed: facts read-only, no actions besides Reopen (P7 C8). */}
			{!closed || threads.length === 0 ? (
				<View className="mt-8 gap-1">
					{threads.length === 0 ? (
						<ActionRow icon={ChatCircleIcon} label={t('manage_messages')} onPress={openMessages} />
					) : null}
					{!closed ? (
						<>
							<ActionRow
								icon={CheckCircleIcon}
								label={t('manage_close')}
								disabled={busy}
								onPress={() => void act('close')}
							/>
							<ActionRow
								icon={HeartIcon}
								label={t('manage_returned')}
								disabled={busy}
								onPress={() => setConfirmReturned(true)}
							/>
						</>
					) : null}
				</View>
			) : null}

			<AlertDialog open={confirmReturned} onOpenChange={setConfirmReturned}>
				<AlertDialogContent>
					<AlertDialogTitle>{tl('finder_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{tl('finder_confirm_body')}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogAction variant="default" onPress={() => void markReturned()}>
							{tl('finder_confirm_yes')}
						</AlertDialogAction>
						<AlertDialogCancel>{tl('finder_confirm_no')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ScrollView>
	);
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<View accessible>
			<Text className="font-sans-bold text-sm text-muted-foreground">{label}</Text>
			<Text className="mt-0.5">{value}</Text>
		</View>
	);
}

/** Calm note (system §10 Note): muted surface, radius 20, icon 22; announced politely when it appears. */
function Note({
	icon,
	title,
	text,
	children,
}: {
	icon: PhosphorIcon;
	title?: string;
	text: string;
	children?: React.ReactNode;
}) {
	return (
		<View role="status" aria-live="polite" className="mt-10 flex-row gap-3 rounded-row bg-muted px-[18px] py-4">
			<Icon as={icon} size={22} className="mt-0.5" />
			<View className="min-w-0 flex-1">
				{title ? <Text className="font-sans-bold text-control leading-[22px]">{title}</Text> : null}
				<Text className="text-control leading-[22px]">{text}</Text>
				{children ? <View className="mt-3 self-start">{children}</View> : null}
			</View>
		</View>
	);
}

/** Manage action as a text row (P7): 56 px, icon 20 in primary, pressed foreground at 10 %. */
function ActionRow({
	icon,
	label,
	onPress,
	disabled,
}: {
	icon: PhosphorIcon;
	label: string;
	onPress: () => void;
	disabled?: boolean;
}) {
	const focus = useFocusRing();
	return (
		<Pressable
			role="button"
			onPress={onPress}
			disabled={disabled}
			aria-disabled={disabled}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className="-mx-3 min-h-14 flex-row items-center gap-3.5 rounded-row px-3 active:bg-foreground/10"
		>
			<Icon as={icon} size={20} className="text-primary" />
			<Text className="font-sans-semibold">{label}</Text>
		</Pressable>
	);
}
