import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { NotEqualsIcon } from 'phosphor-react-native/src/icons/NotEquals';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormatter, useLocale, useTranslations } from 'use-intl';

import { type EventParams, track } from '@zivali/analytics';
import { useConfirmMatchMutation, useListMatchesQuery, useRejectMatchMutation } from '@zivali/api/matches';
import type { CachedReport } from '@zivali/api/sync';
import type { MatchSuggestion, PublicReport } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { forgetShown, LIST_STATES, Strength, useBack, usePlaceLabel, useReasonLines } from '@/components/matches/parts';
import { Note } from '@/components/report/parts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { useReport } from '@/lib/data/reports';
import { isOnline, useNetworkState } from '@/lib/net';
import { cn } from '@/lib/utils';

type Mine = PublicReport | CachedReport;
type Photo = { url: string; alt: string };

/** Flow-style bar: back, the centred "Ujemanje" h1 (P11 M3). */
function TopBar({ code }: { code: string }) {
	const t = useTranslations('matches');
	const tr = useTranslations('report');
	const back = useBack(`/r/${code}/matches`);
	return (
		<View className="h-14 flex-row items-center gap-2 px-3">
			<Button variant="ghost" size="icon" aria-label={tr('mobile_back')} onPress={back}>
				<Icon as={CaretLeftIcon} size={22} />
			</Button>
			<Text role="heading" className="flex-1 text-center font-sans-bold text-[17px] leading-6">
				{t('review_title')}
			</Text>
			<View className="size-11" />
		</View>
	);
}

/**
 * One 4:3 frame with the My pet / candidate toggle (also a swipe), thumbnails when the side has several photos. The
 * candidate shows first: it is what is new.
 */
function Comparison({
	mine,
	other,
}: {
	mine: Photo[];
	other: { photos: Photo[]; type: MatchSuggestion['other']['type'] };
}) {
	const t = useTranslations('matches');
	const tp = useTranslations('photos');
	const [side, setSide] = React.useState<'mine' | 'other'>('other');
	const [index, setIndex] = React.useState(0);
	const select = (next: string) => {
		setSide(next === 'mine' ? 'mine' : 'other');
		setIndex(0);
	};
	const photos = side === 'mine' ? mine : other.photos;
	const photo = photos[index];
	const swipe = Gesture.Exclusive(
		Gesture.Fling()
			.direction(Directions.LEFT)
			.runOnJS(true)
			.onEnd(() => select('other')),
		Gesture.Fling()
			.direction(Directions.RIGHT)
			.runOnJS(true)
			.onEnd(() => select('mine'))
	);
	return (
		<View>
			<GestureDetector gesture={swipe}>
				<View className="aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl bg-muted">
					{photo ? (
						<Image
							source={{ uri: photo.url }}
							role="img"
							accessible
							aria-label={photo.alt}
							resizeMode="cover"
							className="h-full w-full"
						/>
					) : (
						<Icon as={PawPrintIcon} size={48} weight="fill" className="text-muted-foreground" />
					)}
				</View>
			</GestureDetector>
			<Tabs value={side} onValueChange={select} className="mt-3">
				<TabsList className="max-w-full">
					<TabsTrigger value="mine">{t('toggle_mine')}</TabsTrigger>
					<TabsTrigger value="other">
						{other.type === 'sighted' ? t('toggle_sighted') : t('toggle_found')}
					</TabsTrigger>
				</TabsList>
			</Tabs>
			{photos.length > 1 && (
				<View className="mt-3 flex-row flex-wrap gap-2">
					{photos.map((p, i) => (
						<Pressable
							key={p.url}
							role="button"
							aria-label={tp('thumb_a11y', { n: i + 1, total: photos.length })}
							aria-selected={i === index}
							onPress={() => setIndex(i)}
							className={cn(
								'h-[72px] w-[88px] overflow-hidden rounded-[16px] bg-muted',
								i !== index && 'opacity-[.55]'
							)}
						>
							<Image source={{ uri: p.url }} aria-hidden className="h-full w-full" />
						</Pressable>
					))}
				</View>
			)}
		</View>
	);
}

type Result = 'same' | 'diff' | 'unknown';
const results: Record<Result, { icon: PhosphorIcon; className: string }> = {
	same: { icon: CheckCircleIcon, className: 'text-primary' },
	diff: { icon: NotEqualsIcon, className: 'text-foreground' },
	unknown: { icon: QuestionIcon, className: 'text-foreground' },
};
const compare = <T,>(a: T | null | undefined, b: T | null | undefined, same = a === b): Result =>
	a == null || b == null ? 'unknown' : same ? 'same' : 'diff';

/**
 * Facts, my pet left and the candidate right; each row says "Ujema se", "Razlikuje se" or "Ni podatka" with an icon,
 * never colour alone. "Kdaj" is not compared (times always differ). Each row is read as one sentence with its headers.
 */
function FactsTable({ mine, other }: { mine: Mine; other: MatchSuggestion['other'] }) {
	const t = useTranslations('matches');
	const ta = useTranslations('attributes');
	const locale = useLocale();
	const format = useFormatter();
	const myPlace = usePlaceLabel(mine.area);
	const otherPlace = usePlaceLabel(other.area);
	const unknown = t('result_unknown');
	const colours = (list: Mine['colours']) => {
		const text = list
			.map((c) => ta(`colours.${c}`))
			.join(', ')
			.toLocaleLowerCase(locale);
		return text ? text[0].toLocaleUpperCase(locale) + text.slice(1) : null;
	};
	const sex = (s: Mine['sex']) => (s && s !== 'unknown' ? ta(`sex.${s}`) : null);
	const when = (at: string) =>
		format.dateTime(Date.parse(at), { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
	const sameColours =
		mine.colours.length === other.colours.length && mine.colours.every((c) => other.colours.includes(c));
	const rows: { label: string; mine: string | null; other: string | null; result?: Result }[] = [
		{
			label: t('row_species'),
			mine: ta(`species.${mine.species}`),
			other: ta(`species.${other.species}`),
			result: compare(mine.species, other.species),
		},
		{
			label: t('row_size'),
			mine: mine.size ? ta(`size.${mine.size}`) : null,
			other: other.size ? ta(`size.${other.size}`) : null,
			result: compare(mine.size, other.size),
		},
		{
			label: t('row_colour'),
			mine: colours(mine.colours),
			other: colours(other.colours),
			result: compare(colours(mine.colours), colours(other.colours), sameColours),
		},
		{
			label: t('row_sex'),
			mine: sex(mine.sex),
			other: sex(other.sex),
			result: compare(sex(mine.sex), sex(other.sex)),
		},
		{
			label: t('row_area'),
			mine: myPlace ?? null,
			other: otherPlace ?? null,
			result: compare(myPlace, otherPlace),
		},
		{ label: t('row_when'), mine: when(mine.event_at), other: when(other.event_at) },
	];
	const word = (result?: Result) => (result ? t(`result_${result}`) : t('result_not_compared'));
	return (
		<View className="mt-2">
			<View aria-hidden className="flex-row pb-1.5">
				{[t('col_feature'), t('col_mine'), t('col_other')].map((head) => (
					<Text key={head} className="flex-1 pr-2.5 font-sans-bold text-sm leading-5 text-muted-foreground">
						{head}
					</Text>
				))}
			</View>
			{rows.map((row) => (
				<View
					key={row.label}
					accessible
					aria-label={`${row.label}: ${t('col_mine')} ${row.mine ?? unknown}, ${t('col_other')} ${row.other ?? unknown}. ${word(row.result)}`}
					className="flex-row py-1.5"
				>
					<View className="flex-1 pr-2.5">
						<Text className="font-sans-bold text-[15px] leading-5">{row.label}</Text>
						{row.result ? (
							<View className="mt-0.5 flex-row items-center gap-1.5">
								<Icon
									as={results[row.result].icon}
									weight={row.result === 'same' ? 'fill' : 'bold'}
									size={16}
									className={results[row.result].className}
								/>
								<Text className="shrink font-sans-bold text-sm leading-5">{word(row.result)}</Text>
							</View>
						) : (
							<Text className="text-muted-foreground">–</Text>
						)}
					</View>
					<Text className="flex-1 pr-2.5 text-[15px] leading-5">{row.mine ?? unknown}</Text>
					<Text className="flex-1 pr-2.5 text-[15px] leading-5">{row.other ?? unknown}</Text>
				</View>
			))}
		</View>
	);
}

/** The small line under the comparison: an icon and 14 muted text (privacy, P11 M3). */
function SmallNote({ icon, children }: { icon: PhosphorIcon; children: React.ReactNode }) {
	return (
		<View className="flex-row gap-2">
			<Icon as={icon} weight="fill" size={16} className="mt-0.5 text-primary" />
			<Text className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">{children}</Text>
		</View>
	);
}

const regionOf = (report: Mine | undefined) =>
	report?.region_slug as EventParams['match_suggested']['region'] | undefined;

/** Fixed footer: confirm and reject (or the confirmed state and "Odpri pogovor"), both reachable without scrolling. */
function Actions({ match, mine, code }: { match: MatchSuggestion; mine: Mine | undefined; code: string }) {
	const t = useTranslations('matches');
	const router = useRouter();
	const errorText = useErrorText();
	const back = useBack(`/r/${code}/matches`);
	const online = isOnline(useNetworkState());
	const [confirm, confirming] = useConfirmMatchMutation();
	const [reject, rejecting] = useRejectMatchMutation();
	const [reason, setReason] = React.useState('');

	// Confirming opens the conversation (C9); a confirmed match answers with the same one again (idempotent).
	const openChat = async (first: boolean) => {
		try {
			const { conversation_id } = await confirm({ id: match.id }).unwrap();
			const region = regionOf(mine);
			if (first && region)
				track('match_confirmed', {
					species: match.other.species,
					region,
					match_source: match.chip_match ? 'chip' : 'attributes',
				});
			// The P12 conversation screen is TASK-21.4's route (C15 `/inbox/<id>`).
			router.push(`/inbox/${conversation_id}` as Href);
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const onReject = async () => {
		forgetShown(code, match.id);
		try {
			const text = reason.trim();
			await reject({ id: match.id, body: text ? { reason: text } : undefined }).unwrap();
			toast(t('rejected_toast'));
			back();
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const offlineHint = online ? undefined : t('offline');

	if (match.state === 'confirmed')
		return (
			<View>
				<View className="flex-row items-center gap-2">
					<Icon as={CheckCircleIcon} weight="fill" size={22} className="text-primary" />
					<Text className="font-sans-bold text-[17px] leading-6 text-primary">{t('confirmed')}</Text>
				</View>
				<Text className="mt-1">{t('already_confirmed')}</Text>
				{!online && (
					<Note icon={WifiSlashIcon} iconClassName="text-foreground" className="mt-3">
						{t('offline')}
					</Note>
				)}
				<Button
					size="lg"
					className="mt-3"
					disabled={!online}
					accessibilityHint={offlineHint}
					loading={confirming.isLoading}
					onPress={() => void openChat(false)}
				>
					<Icon as={ChatCircleIcon} />
					{t('open_chat')}
				</Button>
			</View>
		);

	return (
		<View>
			{online ? (
				<SmallNote icon={ShieldCheckIcon}>{t('confirm_note')}</SmallNote>
			) : (
				<Note role="status" icon={WifiSlashIcon} iconClassName="text-foreground">
					{t('offline')}
				</Note>
			)}
			<Button
				size="lg"
				className="mt-3"
				disabled={!online || rejecting.isLoading}
				accessibilityHint={offlineHint}
				loading={confirming.isLoading}
				onPress={() => void openChat(true)}
			>
				{t('confirm')}
			</Button>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant="text"
						className="mt-1"
						disabled={!online || confirming.isLoading}
						accessibilityHint={offlineHint}
						loading={rejecting.isLoading}
					>
						{t('reject')}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogTitle>{t('reject_title')}</AlertDialogTitle>
					<AlertDialogDescription>{t('reject_body')}</AlertDialogDescription>
					<FormField label={t('reject_reason')} className="mt-4">
						<Textarea value={reason} onChangeText={setReason} maxLength={500} />
					</FormField>
					<AlertDialogFooter>
						<AlertDialogAction onPress={() => void onReject()}>{t('reject_confirm')}</AlertDialogAction>
						<AlertDialogCancel>{t('reject_cancel')}</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</View>
	);
}

function Review({ match, mine, code }: { match: MatchSuggestion; mine: Mine | undefined; code: string }) {
	const t = useTranslations('matches');
	const ta = useTranslations('attributes');
	const insets = useSafeAreaInsets();
	const reasons = useReasonLines(match);
	const species = ta(`species.${match.other.species}`);
	const minePhotos: Photo[] = !mine
		? []
		: 'photos' in mine
			? mine.photos.map((p) => ({ url: p.url, alt: t('alt_mine', { alt: p.alt || mine.name || species }) }))
			: mine.thumb_url
				? [{ url: mine.thumb_url, alt: t('alt_mine', { alt: mine.name || species }) }]
				: [];
	const otherPhotos = match.other.photos.map((p) => ({ url: p.url, alt: t('alt_other', { alt: p.alt || species }) }));

	// match_suggested: the owner views a suggestion (C12); track() is a no-op without consent.
	const region = regionOf(mine);
	const viewed = React.useRef<string | null>(null);
	React.useEffect(() => {
		if (match.state !== 'suggested' || !region || viewed.current === match.id) return;
		viewed.current = match.id;
		track('match_suggested', {
			species: match.other.species,
			region,
			match_source: match.chip_match ? 'chip' : 'attributes',
		});
	}, [match, region]);

	return (
		<>
			<ScrollView contentContainerClassName="px-5 pb-6 pt-1">
				<Comparison mine={minePhotos} other={{ photos: otherPhotos, type: match.other.type }} />
				<View className="mt-8">
					<Strength strength={match.strength} size="lg" />
				</View>
				{match.chip_match && (
					<Note icon={ShieldCheckIcon} className="mt-5">
						{t('chip_banner')}
					</Note>
				)}
				<Text role="heading" className="mt-8 font-sans-bold text-[17px] leading-6">
					{t('why_title')}
				</Text>
				<View className="mt-3 gap-2">
					{reasons.map((line) => (
						<View key={line} className="flex-row gap-3">
							<Icon as={CheckIcon} weight="bold" size={18} className="mt-[3px] text-primary" />
							<Text className="min-w-0 flex-1">{line}</Text>
						</View>
					))}
				</View>
				{mine && (
					<>
						<Text role="heading" className="mt-8 font-sans-bold text-[17px] leading-6">
							{t('table_caption')}
						</Text>
						<FactsTable mine={mine} other={match.other} />
					</>
				)}
				{match.other.type === 'sighted' && (
					<Note icon={EyeIcon} iconClassName="text-foreground" className="mt-5">
						{t('caveat_sighting')}
					</Note>
				)}
				{match.chip_match && match.other.photos.length === 0 && (
					<Note icon={ImageIcon} iconClassName="text-foreground" className="mt-5">
						{t('caveat_no_photo')}
					</Note>
				)}
			</ScrollView>
			<View className="bg-background px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
				<Actions match={match} mine={mine} code={code} />
			</View>
		</>
	);
}

/** Comparison skeleton: the photo frame, the toggle and the lines, one "Nalaganje …". */
function Loading() {
	const tc = useTranslations('common');
	return (
		<View aria-busy className="px-5 pt-1">
			<Skeleton className="aspect-[4/3] rounded-3xl" />
			<Skeleton className="mt-3 h-[52px] rounded-full" />
			<Text role="status" aria-live="polite" className="mt-6 text-sm text-muted-foreground">
				{tc('loading')}
			</Text>
			<Skeleton className="mt-4 h-7 w-64" />
			<View className="mt-6 gap-3">
				<Skeleton className="h-6 w-3/5" />
				<Skeleton className="h-6 w-2/5" />
				<Skeleton className="h-6 w-1/2" />
			</View>
		</View>
	);
}

/**
 * P11 review (`/r/[code]/matches/[id]`): compare photos and details, see why we think so, then "To je moja žival"
 * (opens the conversation) or "Ni moja žival" (one confirmation, an optional reason, hidden for good). No contact
 * data and no exact point appear here: the candidate is the C8 `other` subset with its fuzzed area only.
 */
export default function MatchReviewScreen() {
	const { code = '', id = '' } = useLocalSearchParams<{ code: string; id: string }>();
	const te = useTranslations('errors');
	const tc = useTranslations('common');
	const insets = useSafeAreaInsets();
	const { data, isLoading, error, refetch } = useListMatchesQuery({ code, state: LIST_STATES });
	const { data: mine } = useReport(code);
	const match = data?.items.find((m) => m.id === id);

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<TopBar code={code} />
			{isLoading ? (
				<Loading />
			) : match ? (
				<Review match={match} mine={mine} code={code} />
			) : error && !data ? (
				<View className="px-5 pt-6">
					<Note
						role="alert"
						icon={WarningCircleIcon}
						iconClassName="text-destructive"
						action={
							<Button variant="text" size="sm" onPress={() => void refetch()}>
								<Icon as={ArrowClockwiseIcon} />
								{tc('try_again')}
							</Button>
						}
					>
						{tc('inline_error')}
					</Note>
				</View>
			) : (
				// Rejected, withdrawn or an old link: the match is no longer there.
				<EmptyState className="px-5 pt-6" title={te('page_410_title')} description={te('page_410_body')} />
			)}
		</View>
	);
}
