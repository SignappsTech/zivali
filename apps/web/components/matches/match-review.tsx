'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { FilePdfIcon } from '@phosphor-icons/react/dist/ssr/FilePdf';
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { NotEqualsIcon } from '@phosphor-icons/react/dist/ssr/NotEquals';
import { PawPrintIcon } from '@phosphor-icons/react/dist/ssr/PawPrint';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/ssr/WifiSlash';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type EventParams, track } from '@zivali/analytics';
import { useConfirmMatchMutation, useListMatchesQuery, useRejectMatchMutation } from '@zivali/api/matches';
import { useGetReportQuery } from '@zivali/api/reports';
import type { MatchSuggestion, PublicPhoto, PublicReport } from '@zivali/types';
import { AuthGate } from '@/components/auth/gate';
import { errorCode, useErrorText } from '@/components/auth/parts';
import {
	forgetShown,
	isWithdrawn,
	LIST_STATES,
	Note,
	sortMatches,
	Strength,
	useBands,
	usePlaceLabel,
	useReasonLines,
} from '@/components/matches/parts';
import { MoreMenu } from '@/components/report/slots/more-menu';
import { InlineError, ringClass, SpotIllustration } from '@/components/shell/page';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { StatusLabel } from '@/components/ui/status-label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/client-navigation';
import { getPathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** The lost report the matches belong to: the owner view for its managers. */
type Mine = PublicReport;
type Photo = PublicPhoto;

const TITLE_ID = 'matches-title';
const REVIEW_ID = 'match-review-title';
// Tailwind `lg`: from here the list and the review sit side by side (P11 responsive).
const WIDE = '(min-width: 64rem)';

function useWide() {
	return React.useSyncExternalStore(
		(onChange) => {
			const list = window.matchMedia?.(WIDE);
			list?.addEventListener('change', onChange);
			return () => list?.removeEventListener('change', onChange);
		},
		() => window.matchMedia?.(WIDE).matches ?? false,
		() => false
	);
}

function useOnline() {
	return React.useSyncExternalStore(
		(onChange) => {
			window.addEventListener('online', onChange);
			window.addEventListener('offline', onChange);
			return () => {
				window.removeEventListener('online', onChange);
				window.removeEventListener('offline', onChange);
			};
		},
		() => navigator.onLine,
		() => true
	);
}

const regionOf = (report: Mine | undefined) =>
	report?.region_slug as EventParams['match_suggested']['region'] | undefined;
const sourceOf = (match: MatchSuggestion) => (match.chip_match ? 'chip' : 'attributes');

/** The pet's photo 48 and name above the h1 (P11 W1). */
function PetHeader({ mine }: { mine?: Mine }) {
	const thumb = mine?.photos[0]?.thumb_url;
	if (!mine?.name && !thumb) return null;
	return (
		<div className="mb-6 flex items-center gap-3">
			{thumb && (
				// eslint-disable-next-line @next/next/no-img-element -- a 48 px thumbnail from the media host
				<img src={thumb} alt="" width={48} height={48} className="size-12 rounded-full bg-muted object-cover" />
			)}
			{mine?.name && <span className="text-lg font-bold">{mine.name}</span>}
		</div>
	);
}

/** One row (no card): photo 64, place and distance, status word with the strength (or "confirmed"), the time gap. */
function MatchRow({ match, code, selected }: { match: MatchSuggestion; code: string; selected: boolean }) {
	const t = useTranslations('matches');
	const { distance, gap } = useBands(match);
	const area = usePlaceLabel(match.other.area)?.split(',')[0];
	const place = area && distance ? t('row_place', { area, distance }) : (area ?? distance);
	const status = match.other.type === 'sighted' ? 'sighted' : 'found';
	const photo = match.other.photos[0];
	return (
		<li>
			{match.chip_match && (
				<p aria-hidden="true" className="mb-3 flex items-center gap-2 text-[15px] leading-5 font-bold">
					<ShieldCheckIcon weight="fill" className="size-[18px] shrink-0 text-primary" />
					{t('chip_row')}
				</p>
			)}
			<Link
				href={{ pathname: '/r/[code]/matches', params: { code }, query: { m: match.id } }}
				aria-current={selected || undefined}
				className={cn(
					'-m-2 flex items-center gap-4 rounded-row p-2 text-foreground hover:bg-foreground/10 active:bg-accent active:text-accent-foreground',
					ringClass,
					selected && 'bg-accent shadow-[inset_3px_0_0_hsl(var(--primary))] hover:bg-accent'
				)}
			>
				{photo ? (
					// eslint-disable-next-line @next/next/no-img-element -- a 64 px thumbnail from the media host
					<img
						src={photo.thumb_url}
						alt=""
						width={64}
						height={64}
						loading="lazy"
						className="size-16 shrink-0 rounded-row bg-muted object-cover"
					/>
				) : (
					<span aria-hidden="true" className="size-16 shrink-0 rounded-row bg-muted" />
				)}
				<span className="grid min-w-0 flex-1 gap-1">
					{match.chip_match && <span className="sr-only">{`${t('chip_row')}, `}</span>}
					{place && <span className="text-[17px] leading-6 font-bold">{place}</span>}
					<span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
						<StatusLabel status={status}>{t(`row_${status}`)}</StatusLabel>
						{match.state === 'confirmed' ? (
							<span className="inline-flex items-center gap-[5px] text-sm leading-5 font-bold text-primary">
								<CheckCircleIcon weight="fill" aria-hidden="true" className="size-4 shrink-0" />
								{t('confirmed')}
							</span>
						) : (
							<Strength strength={match.strength} />
						)}
					</span>
					{gap && <span className="text-sm leading-5 text-muted-foreground">{t('row_gap', { gap })}</span>}
				</span>
				<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
			</Link>
		</li>
	);
}

/** P11 M7 / W2: rows in their final shape (photo 64, three lines), one "Nalaganje …". */
function LoadingRows() {
	const tc = useTranslations('common');
	return (
		<div aria-busy="true">
			<p role="status" className="text-sm text-muted-foreground">
				{tc('loading')}
			</p>
			<ul aria-hidden="true" className="mt-4 grid gap-5">
				{[0, 1, 2].map((i) => (
					<li key={i} className="flex items-center gap-4">
						<Skeleton className="size-16 shrink-0 rounded-row" />
						<span className="grid flex-1 gap-2">
							<Skeleton className="h-6 w-3/5" />
							<Skeleton className="h-5 w-4/5" />
							<Skeleton className="h-5 w-2/5" />
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** The review column's skeleton (W2): title, two photos, the strength line, reasons and table rows. */
function ReviewSkeleton() {
	return (
		<div aria-hidden="true">
			<Skeleton className="h-9 w-40" />
			<div className="mt-6 grid gap-6 lg:grid-cols-2">
				<Skeleton className="aspect-[4/3] rounded-3xl" />
				<Skeleton className="aspect-[4/3] rounded-3xl max-lg:hidden" />
			</div>
			<Skeleton className="mt-8 h-7 w-64" />
			<div className="mt-6 grid gap-3">
				<Skeleton className="h-6 w-3/5" />
				<Skeleton className="h-6 w-2/5" />
				<Skeleton className="h-6 w-1/2" />
			</div>
			<div className="mt-8 grid gap-4">
				{[0, 1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		</div>
	);
}

/** "Ujemanj še ni": the search keeps running; share the report (the system share sheet, else the copied link). */
function Empty({ code }: { code: string }) {
	const t = useTranslations('matches');
	const ts = useTranslations('share');
	const locale = useLocale();
	const share = async () => {
		const path = getPathname({ locale, href: { pathname: '/r/[code]', params: { code } } });
		const url = new URL(path, window.location.origin).href;
		try {
			if (navigator.share) await navigator.share({ url });
			else {
				await navigator.clipboard.writeText(url);
				toast.success(ts('copied'));
			}
		} catch {
			// The share sheet was closed, or the clipboard is not allowed: nothing to tell.
		}
	};
	return (
		<EmptyState
			illustration={<SpotIllustration />}
			title={t('empty_title')}
			description={t('empty_body')}
			action={
				<div className="flex flex-wrap justify-center gap-3">
					<Button variant="secondary" onClick={() => void share()}>
						<ShareNetworkIcon weight="bold" aria-hidden="true" />
						{t('empty_share')}
					</Button>
					{/* The poster is a server route (C15), not a page: a plain link, in the page's language. */}
					<Button variant="secondary" asChild>
						<a href={`/r/${code}/poster.pdf?lang=${locale}`}>
							<FilePdfIcon weight="bold" aria-hidden="true" />
							{t('empty_poster')}
						</a>
					</Button>
					<Button variant="secondary" asChild>
						<Link href="/account/alerts">
							<BellIcon weight="bold" aria-hidden="true" />
							{t('empty_alerts')}
						</Link>
					</Button>
				</div>
			}
		/>
	);
}

/** Not a manager of this report (C8 FORBIDDEN): the permission sentence and the way back to the report, never a retry. */
function Forbidden({ code }: { code: string }) {
	const te = useTranslations('errors');
	const tc = useTranslations('common');
	return (
		<>
			<Note role="alert" icon={LockSimpleIcon} iconClassName="text-foreground">
				{te('FORBIDDEN')}
			</Note>
			<Button asChild variant="secondary" className="mt-5">
				<Link href={{ pathname: '/r/[code]', params: { code } }}>
					<CaretLeftIcon weight="bold" aria-hidden="true" />
					{tc('back')}
				</Link>
			</Button>
		</>
	);
}

/** One side of the comparison: caption, the 4:3 photo and, with several photos, 88 x 72 thumbnails. */
function Side({ label, photos }: { label?: string; photos: Photo[] }) {
	const tp = useTranslations('photos');
	const [index, setIndex] = React.useState(0);
	const photo = photos[index];
	return (
		<figure className="m-0 min-w-0">
			{label && <figcaption className="mb-2 text-[15px] leading-5 font-bold">{label}</figcaption>}
			{photo ? (
				// eslint-disable-next-line @next/next/no-img-element -- public media URLs (C5), already sized by the API
				<img
					src={photo.url}
					alt={photo.alt}
					width={photo.width}
					height={photo.height}
					className="aspect-[4/3] w-full rounded-3xl bg-muted object-cover"
				/>
			) : (
				<div className="grid aspect-[4/3] place-items-center rounded-3xl bg-muted">
					<PawPrintIcon weight="fill" aria-hidden="true" className="size-12 text-muted-foreground" />
				</div>
			)}
			{photos.length > 1 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{photos.map((p, i) => (
						<button
							key={p.url}
							type="button"
							aria-label={tp('thumb_a11y', { n: i + 1, total: photos.length })}
							aria-pressed={i === index}
							onClick={() => setIndex(i)}
							className={cn(
								'h-[72px] w-[88px] cursor-pointer overflow-hidden rounded-[16px] bg-muted',
								ringClass,
								i !== index && 'opacity-55'
							)}
						>
							{/* eslint-disable-next-line @next/next/no-img-element -- an 88 x 72 thumbnail */}
							<img src={p.thumb_url} alt="" width={88} height={72} className="size-full object-cover" />
						</button>
					))}
				</div>
			)}
		</figure>
	);
}

/**
 * P11 comparison: from `lg` my pet and the candidate side by side with captions; below it one 4:3 frame with the
 * "Moja žival" / candidate toggle, the candidate first (it is what is new).
 */
function Comparison({ mine, other, type }: { mine: Photo[]; other: Photo[]; type: MatchSuggestion['other']['type'] }) {
	const t = useTranslations('matches');
	const sides = [
		{ key: 'mine', label: t('toggle_mine'), photos: mine },
		{ key: 'other', label: type === 'sighted' ? t('toggle_sighted') : t('toggle_found'), photos: other },
	];
	return (
		<>
			<div className="mt-6 grid grid-cols-2 gap-6 max-lg:hidden">
				{sides.map((side) => (
					<Side key={side.key} label={side.label} photos={side.photos} />
				))}
			</div>
			<Tabs defaultValue="other" className="mt-6 gap-3 lg:hidden">
				{sides.map((side) => (
					<TabsContent key={side.key} value={side.key}>
						<Side photos={side.photos} />
					</TabsContent>
				))}
				<TabsList className="max-w-full">
					{sides.map((side) => (
						<TabsTrigger key={side.key} value={side.key}>
							{side.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>
		</>
	);
}

type Result = 'same' | 'diff' | 'unknown';
const RESULTS: Record<Result, { icon: PhosphorIcon; weight: 'fill' | 'bold'; className: string }> = {
	same: { icon: CheckCircleIcon, weight: 'fill', className: 'text-primary' },
	diff: { icon: NotEqualsIcon, weight: 'bold', className: 'text-foreground' },
	unknown: { icon: QuestionIcon, weight: 'bold', className: 'text-foreground' },
};
const compare = <T,>(a: T | null | undefined, b: T | null | undefined, same = a === b): Result =>
	a == null || b == null ? 'unknown' : same ? 'same' : 'diff';

/** "Ujema se", "Razlikuje se" or "Ni podatka" with its icon, never colour alone; "Kdaj" is not compared. */
function ResultWord({ result }: { result?: Result }) {
	const t = useTranslations('matches');
	if (!result)
		return (
			<>
				<span aria-hidden="true" className="text-muted-foreground">
					–
				</span>
				<span className="sr-only">{t('result_not_compared')}</span>
			</>
		);
	const { icon: Icon, weight, className } = RESULTS[result];
	return (
		<span className="inline-flex items-center gap-1.5 text-sm leading-5 font-bold">
			<Icon weight={weight} aria-hidden="true" className={cn('size-4 shrink-0', className)} />
			{t(`result_${result}`)}
		</span>
	);
}

const headCell = 'pr-2.5 pb-1.5 text-left align-bottom text-sm leading-5 font-bold text-muted-foreground lg:pr-4';
const bodyCell = 'py-1.5 pr-2.5 text-left align-top [overflow-wrap:anywhere] lg:py-3.5 lg:pr-4';

/**
 * Facts, my pet left and the candidate right, as a real table with headers (P11 accessibility). Below `sm` the result
 * moves under the row's label, so four columns never squeeze at 320 px.
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
		return text ? text[0]!.toLocaleUpperCase(locale) + text.slice(1) : null;
	};
	const sex = (s: Mine['sex']) => (s && s !== 'unknown' ? ta(`sex.${s}`) : null);
	const when = (at: string) =>
		format.dateTime(new Date(at), { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
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
	return (
		<>
			<h3 className="mt-8 text-[17px] leading-6 font-bold">{t('table_caption')}</h3>
			<table className="mt-2 w-full border-collapse text-[15px] leading-5 lg:text-base lg:leading-6">
				<caption className="sr-only">{t('table_caption')}</caption>
				<thead>
					<tr>
						<th scope="col" className={headCell}>
							{t('col_feature')}
						</th>
						<th scope="col" className={headCell}>
							{t('col_mine')}
						</th>
						<th scope="col" className={headCell}>
							{t('col_other')}
						</th>
						<th scope="col" className={cn(headCell, 'max-sm:hidden')}>
							{t('col_result')}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.label}>
							<th scope="row" className={cn(bodyCell, 'font-bold')}>
								{row.label}
								<span className="mt-0.5 block font-normal sm:hidden">
									<ResultWord result={row.result} />
								</span>
							</th>
							<td className={bodyCell}>{row.mine ?? unknown}</td>
							<td className={bodyCell}>{row.other ?? unknown}</td>
							<td className={cn(bodyCell, 'max-sm:hidden')}>
								<ResultWord result={row.result} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</>
	);
}

/**
 * Confirm and reject (or the confirmed state with "Odpri pogovor"). Confirming opens the conversation (C9, idempotent
 * on a confirmed match); rejecting asks once, with an optional reason, and hides the match for good. No contact data
 * here. Offline both wait, with the reason said.
 */
function Actions({ match, mine, code }: { match: MatchSuggestion; mine?: Mine; code: string }) {
	const t = useTranslations('matches');
	const te = useTranslations('errors');
	const tAuth = useTranslations('auth');
	const errorText = useErrorText();
	const router = useRouter();
	const online = useOnline();
	const offlineId = React.useId();
	const [confirm, confirming] = useConfirmMatchMutation();
	const [reject, rejecting] = useRejectMatchMutation();
	const [reason, setReason] = React.useState('');
	const [unverified, setUnverified] = React.useState(false);
	const [verify, setVerify] = React.useState(false);

	// A ref, not `confirming.isLoading`: a second trigger in the same tick (AuthGate's onReady) sees stale state.
	const opening = React.useRef(false);
	const openChat = async (first: boolean) => {
		if (opening.current) return;
		opening.current = true;
		try {
			await confirm({ id: match.id }).unwrap();
			const region = regionOf(mine);
			// match_confirmed (C12): track() drops it without analytics consent.
			if (first && region)
				track('match_confirmed', { species: match.other.species, region, match_source: sourceOf(match) });
			// TODO(TASK-21.3): open the conversation itself, { pathname: '/inbox/[id]', params: { id: conversation_id } },
			// once the web conversation page exists; until then the inbox lists it.
			router.push('/inbox');
		} catch (failure) {
			if (errorCode(failure) === 'UNVERIFIED_EMAIL') setUnverified(true);
			else toast.error(errorText(failure));
		} finally {
			opening.current = false;
		}
	};
	const onReject = async () => {
		try {
			const text = reason.trim();
			await reject({ id: match.id, body: text ? { reason: text } : undefined }).unwrap();
			forgetShown(code, match.id);
			toast(t('rejected_toast'));
			router.replace({ pathname: '/r/[code]/matches', params: { code } });
			document.getElementById(TITLE_ID)?.focus();
		} catch (failure) {
			toast.error(errorText(failure));
		}
	};
	const offline = !online && (
		<Note id={offlineId} role="status" icon={WifiSlashIcon} iconClassName="text-foreground" className="mt-4">
			{t('offline')}
		</Note>
	);
	const describedBy = online ? undefined : offlineId;

	if (match.state === 'confirmed')
		return (
			<div className="mt-8">
				<p className="flex items-center gap-2 text-[17px] leading-6 font-bold text-primary">
					<CheckCircleIcon weight="fill" aria-hidden="true" className="size-[22px] shrink-0" />
					{t('confirmed')}
				</p>
				<p className="mt-1">{t('already_confirmed')}</p>
				{offline}
				<Button
					size="lg"
					className="mt-4"
					disabled={!online}
					aria-describedby={describedBy}
					loading={confirming.isLoading}
					onClick={() => void openChat(false)}
				>
					<ChatCircleIcon weight="bold" aria-hidden="true" />
					{t('open_chat')}
				</Button>
			</div>
		);

	return (
		<div className="mt-8">
			{online && (
				<p className="flex max-w-[60ch] gap-2 text-sm leading-5 text-muted-foreground">
					<ShieldCheckIcon weight="fill" aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
					<span>{t('confirm_note')}</span>
				</p>
			)}
			{offline}
			{unverified && (
				<Note
					role="alert"
					icon={WarningCircleIcon}
					iconClassName="text-destructive"
					className="mt-4"
					action={
						<Button variant="text" size="sm" onClick={() => setVerify(true)}>
							{tAuth('gate_unverified_title')}
						</Button>
					}
				>
					{te('UNVERIFIED_EMAIL')}
				</Note>
			)}
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button
					size="lg"
					disabled={!online || rejecting.isLoading}
					aria-describedby={describedBy}
					loading={confirming.isLoading}
					onClick={() => void openChat(true)}
				>
					{t('confirm')}
				</Button>
				<AlertDialog onOpenChange={(open) => !open && setReason('')}>
					<AlertDialogTrigger asChild>
						<Button
							variant="text"
							disabled={!online || confirming.isLoading}
							aria-describedby={describedBy}
							loading={rejecting.isLoading}
						>
							{t('reject')}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogTitle>{t('reject_title')}</AlertDialogTitle>
						<AlertDialogDescription>{t('reject_body')}</AlertDialogDescription>
						<FormField label={t('reject_reason')} className="mt-5">
							<Textarea
								value={reason}
								maxLength={500}
								onChange={(event) => setReason(event.target.value)}
							/>
						</FormField>
						<AlertDialogFooter>
							<AlertDialogAction onClick={() => void onReject()}>{t('reject_confirm')}</AlertDialogAction>
							<AlertDialogCancel>{t('reject_cancel')}</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
			{/* "Potrdite svoj e-naslov" with "Pošlji znova" (P16 G2); confirmed meanwhile, it confirms the match. */}
			{unverified && (
				<AuthGate reason="contact" open={verify} onOpenChange={setVerify} onReady={() => void openChat(true)} />
			)}
		</div>
	);
}

/** The review column: compare, why we think so, the facts, the caveats and the actions (P11 review screen). */
function Review({ match, mine, code }: { match: MatchSuggestion; mine?: Mine; code: string }) {
	const t = useTranslations('matches');
	const ta = useTranslations('attributes');
	const reasons = useReasonLines(match);
	const species = ta(`species.${match.other.species}`);
	const minePhotos = (mine?.photos ?? []).map((p) => ({
		...p,
		alt: t('alt_mine', { alt: p.alt || mine?.name || species }),
	}));
	const otherPhotos = match.other.photos.map((p) => ({ ...p, alt: t('alt_other', { alt: p.alt || species }) }));

	// match_suggested (C12): the owner views a suggestion; track() is a no-op without consent.
	const region = regionOf(mine);
	const viewed = React.useRef<string | null>(null);
	React.useEffect(() => {
		if (match.state !== 'suggested' || !region || viewed.current === match.id) return;
		viewed.current = match.id;
		track('match_suggested', { species: match.other.species, region, match_source: sourceOf(match) });
	}, [match, region]);

	return (
		<>
			<h2
				id={REVIEW_ID}
				tabIndex={-1}
				className="font-display text-[30px] leading-9 font-bold tracking-[-0.02em] outline-none"
			>
				{t('review_title')}
			</h2>
			<Comparison mine={minePhotos} other={otherPhotos} type={match.other.type} />
			<div className="mt-8">
				<Strength strength={match.strength} size="lg" />
			</div>
			{match.chip_match && (
				<Note icon={ShieldCheckIcon} className="mt-5">
					{t('chip_banner')}
				</Note>
			)}
			<h3 className="mt-8 text-[17px] leading-6 font-bold">{t('why_title')}</h3>
			<ul className="mt-3 grid gap-2">
				{reasons.map((line) => (
					<li key={line} className="flex gap-3">
						<CheckIcon
							weight="bold"
							aria-hidden="true"
							className="mt-[3px] size-[18px] shrink-0 text-primary"
						/>
						<span className="min-w-0">{line}</span>
					</li>
				))}
			</ul>
			{mine && <FactsTable mine={mine} other={match.other} />}
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
			<Actions match={match} mine={mine} code={code} />
			{/* The overflow (P11): "Prijavi zlorabo" for the other report, the same menu and dialog as the detail page. */}
			<div className="mt-2 flex justify-end">
				<MoreMenu target={{ type: 'report', id: match.other.short_code }} />
			</div>
		</>
	);
}

/**
 * P11 match review on web (`/r/[code]/ujemanja`, `/en/r/[code]/matches`; `?m=` picks a match): from `lg` the list
 * (360 px) left and the review right, the first match open; below it the list, and a picked match under the h1 with a
 * way back. Managers of the lost report only (C8; others get FORBIDDEN). The candidate is the C8 `other` subset: the
 * fuzzed area, distance and time as bands, never a chip number or contact data.
 */
export function MatchReview({ code, selected }: { code: string; selected?: string }) {
	const t = useTranslations('matches');
	const tc = useTranslations('common');
	const { data, error, isFetching, refetch } = useListMatchesQuery({ code, state: LIST_STATES });
	const { data: mine } = useGetReportQuery({ code });
	const items = React.useMemo(() => sortMatches(data?.items ?? []), [data]);
	const withdrawn = data ? isWithdrawn(code, data.items) : false;
	const wide = useWide();
	const id = selected ?? (wide ? items[0]?.id : undefined);
	const match = items.find((m) => m.id === id);
	const failed = !data && !!error;

	// Picking a match (or going back to the list) moves focus to what changed, so it is announced.
	const last = React.useRef(selected);
	React.useEffect(() => {
		if (last.current === selected) return;
		last.current = selected;
		document.getElementById(selected ? REVIEW_ID : TITLE_ID)?.focus();
	}, [selected]);

	let list: React.ReactNode;
	if (data)
		list = items.length ? (
			<ul className="grid gap-3">
				{items.map((m) => (
					<MatchRow key={m.id} match={m} code={code} selected={m.id === id} />
				))}
			</ul>
		) : (
			<Empty code={code} />
		);
	else if (failed && errorCode(error) === 'FORBIDDEN') list = <Forbidden code={code} />;
	else if (failed) list = <InlineError onRetry={() => void refetch()} retrying={isFetching} />;
	else list = <LoadingRows />;

	return (
		<>
			<div className="lg:flex lg:items-start lg:gap-12">
				<div className="min-w-0 lg:w-[360px] lg:flex-none">
					{selected && (
						<Button asChild variant="text" size="sm" className="mb-3 -ml-3 lg:hidden">
							<Link href={{ pathname: '/r/[code]/matches', params: { code } }}>
								<CaretLeftIcon weight="bold" aria-hidden="true" />
								{tc('back')}
							</Link>
						</Button>
					)}
					<PetHeader mine={mine} />
					<h1
						id={TITLE_ID}
						tabIndex={-1}
						className="font-display text-[30px] leading-9 font-bold tracking-[-0.02em] text-balance outline-none"
					>
						{t('title')}
					</h1>
					{data && (
						<p className={cn('mt-1 text-muted-foreground', selected && 'max-lg:hidden')}>
							{t('count', { count: items.length })}
						</p>
					)}
					<div className={cn('mt-6', selected && !failed && 'max-lg:hidden')}>
						{list}
						{withdrawn && (
							<Note role="status" icon={InfoIcon} iconClassName="text-foreground" className="mt-8">
								{t('withdrawn')}
							</Note>
						)}
					</div>
				</div>
				{!failed && (data ? id : true) && (
					<section
						aria-labelledby={match ? REVIEW_ID : undefined}
						className={cn('mt-10 min-w-0 flex-1 lg:mt-0', !selected && 'max-lg:hidden')}
					>
						{!data ? (
							<ReviewSkeleton />
						) : match ? (
							<Review key={match.id} match={match} mine={mine} code={code} />
						) : (
							// Rejected, withdrawn or an old link: the match is no longer there.
							<EmptyState title={t('unavailable_title')} description={t('unavailable_body')} />
						)}
					</section>
				)}
			</div>
			<Toaster closeLabel={tc('close')} label={tc('toasts_label')} />
		</>
	);
}
