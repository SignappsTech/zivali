import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowsLeftRightIcon } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { FlaskIcon } from 'phosphor-react-native/src/icons/Flask';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { MegaphoneIcon } from 'phosphor-react-native/src/icons/Megaphone';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { type ResponsibleShelterArg, useResponsibleShelter } from '@zivali/api/directory';
import { useGetReportQuery } from '@zivali/api/reports';
import { formatEur, type Locale } from '@zivali/i18n/format';
import { CheckoutSheet } from '@/components/payments/checkout';
import { reportLink } from '@/components/report/slots/slot-b';
import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Pill } from '@/components/ui/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';

import { Heading, Note } from './parts';

/** A page of the web app (C15): the directory index, one shelter's page, or the safety tips. */
const webUrl = (locale: Locale, sl: string, en: string) => `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? en : sl}`;
const directoryUrl = (locale: Locale, slug = '') =>
	webUrl(locale, `/zavetisca${slug && `/${slug}`}`, `/en/shelters${slug && `/${slug}`}`);

function TextLink({
	href,
	className = '-ml-3 self-start',
	children,
}: {
	href: string;
	className?: string;
	children: string;
}) {
	return (
		<Button variant="text" className={className} onPress={() => void Linking.openURL(href)}>
			{children}
		</Button>
	);
}

/** One shelter: name in bold, "Ni potrjeno" for a guess, the number, PokliÄi (`tel:`) and its page. */
function ShelterLines({
	name,
	slug,
	phone,
	display,
	unconfirmed,
}: {
	name: string;
	slug: string;
	phone: string;
	display?: string;
	unconfirmed?: boolean;
}) {
	const t = useTranslations('shelter_row');
	const locale = useLocale() as Locale;
	return (
		<View>
			<Text className="font-sans-bold">{name}</Text>
			{unconfirmed ? (
				<>
					<View className="flex-row items-center gap-1.5">
						<Icon as={QuestionIcon} size={16} className="text-muted-foreground" />
						<Text className="font-sans-bold text-sm text-muted-foreground">{t('unconfirmed_note')}</Text>
					</View>
					<Text className="text-sm text-muted-foreground">{t('unconfirmed_note_hint')}</Text>
				</>
			) : null}
			<Text className={unconfirmed ? 'mt-1 tabular-nums' : 'tabular-nums'}>{display ?? phone}</Text>
			<View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
				<Button
					variant="secondary"
					size="sm"
					aria-label={t('call_a11y', { shelter: name })}
					onPress={() => void Linking.openURL(`tel:${phone}`)}
				>
					<Icon as={PhoneIcon} />
					{t('call')}
				</Button>
				<TextLink href={directoryUrl(locale, slug)}>{t('details_link')}</TextLink>
			</View>
		</View>
	);
}

/**
 * The responsible shelter for the report (P6 `shelter_row`, FR-044, C18): the duty sentence and "does not replace
 * it", then a one-tap call. A likely shelter says "Ni potrjeno"; an unconfirmed or unknown municipality is the note
 * with the directory link, never a guessed number. Kept small here: the shared row of the found flow (TASK-30.3) adds
 * the nearest shelters and the offline cache. No statutory deadline: that text waits for `content.legal_timings` and
 * the lawyer's wording (P6 content slice, LQ-06).
 */
function ShelterRow({ lookup }: { lookup: ResponsibleShelterArg | null }) {
	const t = useTranslations('shelter_row');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const result = useResponsibleShelter(lookup);
	const municipality = result.municipality?.name;

	if (!lookup || result.status === 'loading')
		return (
			<View accessible aria-label={tc('loading')} aria-busy className="mt-8 flex-row gap-3.5">
				<Skeleton className="size-6 rounded-full" />
				<View className="flex-1 gap-2">
					<Skeleton className="h-5 w-full rounded-md" />
					<Skeleton className="h-5 w-2/3 rounded-md" />
				</View>
			</View>
		);
	if (!municipality || (result.status !== 'confirmed' && result.status !== 'likely'))
		return (
			<View className="mt-8">
				<Note icon={PhoneIcon}>
					{municipality && result.status === 'unconfirmed'
						? t('unconfirmed', { municipality })
						: t('unknown_municipality')}
				</Note>
				<TextLink href={directoryUrl(locale)}>{t('directory_link')}</TextLink>
			</View>
		);
	return (
		<View className="mt-8 flex-row gap-3.5">
			<Icon as={PhoneIcon} size={24} className="mt-0.5 text-primary" />
			<View className="min-w-0 flex-1">
				<Text>{`${t('lost_body', { municipality })} ${t('not_replace')}`}</Text>
				<View className="mt-3">
					{result.status === 'confirmed' ? (
						<ShelterLines
							name={result.shelter.name}
							slug={result.shelter.slug}
							phone={result.shelter.phone}
							display={result.shelter.phone_display}
						/>
					) : (
						<>
							<Text className="font-sans-bold text-sm text-muted-foreground">{t('suggested_label')}</Text>
							<ShelterLines
								name={result.likely_shelter.name}
								slug={result.likely_shelter.slug}
								phone={result.likely_shelter.phone}
								unconfirmed
							/>
						</>
					)}
				</View>
			</View>
		</View>
	);
}

const AMOUNTS = [2, 3, 5] as const;

/**
 * P15 contribution at the lost confirmation: a collapsed row (text and caret); open, the 2, 3 and 5 â‚¬ pills with none
 * chosen, then Prispevaj and Skrij at equal weight. Prispevaj opens the checkout hand-off (TASK-32.3); Skrij removes the
 * row. Nothing here holds back the report, matching or alerts.
 */
function ContributionSlot({ reportId, code }: { reportId?: string; code: string }) {
	const t = useTranslations('support');
	const locale = useLocale() as Locale;
	const [open, setOpen] = React.useState(false);
	const [skipped, setSkipped] = React.useState(false);
	const [amount, setAmount] = React.useState<number>();
	const [paying, setPaying] = React.useState(false);
	if (skipped) return null;
	const title = t('contribution_row');
	return (
		<View className="mt-6">
			<Pressable
				role="button"
				aria-expanded={open}
				aria-label={open ? title : `${title}. ${t('contribution_expand_a11y')}`}
				onPress={() => setOpen(!open)}
				className="-mx-3 min-h-14 flex-row items-center gap-3 rounded-row px-3 active:bg-foreground/10"
			>
				<Icon as={HeartIcon} size={20} className="text-muted-foreground" />
				<Text className="min-w-0 flex-1 font-sans-semibold">{title}</Text>
				<Icon as={open ? CaretUpIcon : CaretDownIcon} size={20} className="text-muted-foreground" />
			</Pressable>
			{open ? (
				<>
					<Text className="mt-2">{t('contribution_body')}</Text>
					<View role="radiogroup" aria-label={t('amount_group')} className="mt-4 flex-row flex-wrap gap-2">
						{AMOUNTS.map((n) => (
							<Pill key={n} role="radio" selected={amount === n} onPress={() => setAmount(n)}>
								{t(`contribution_${n}`)}
							</Pill>
						))}
					</View>
					<View className="mt-5 flex-row gap-3">
						<Button
							variant="secondary"
							disabled={!amount || !reportId}
							accessibilityHint={amount ? undefined : t('pay_disabled_help')}
							onPress={() => setPaying(true)}
							className="flex-1"
						>
							{amount
								? t('contribution_pay', { amount: formatEur(amount * 100, locale) })
								: t('contribution_pay_disabled')}
						</Button>
						<Button variant="secondary" onPress={() => setSkipped(true)} className="flex-1">
							{t('contribution_hide')}
						</Button>
					</View>
					{amount ? null : (
						<Text aria-hidden className="mt-2 text-sm text-muted-foreground">
							{t('pay_disabled_help')}
						</Text>
					)}
					{env.EXPO_PUBLIC_APP_ENV === 'production' ? null : (
						<View className="mt-3 flex-row items-center gap-1.5">
							<Icon as={FlaskIcon} size={16} className="text-muted-foreground" />
							<Text className="shrink text-sm text-muted-foreground">{t('test_note')}</Text>
						</View>
					)}
					{amount && reportId ? (
						<CheckoutSheet
							open={paying}
							onOpenChange={setPaying}
							checkout={{
								purpose: 'report_contribution',
								amountCents: amount * 100,
								refs: { report_id: reportId },
								returnTo: `/r/${code}`,
							}}
						/>
					) : null}
				</>
			) : null}
		</View>
	);
}

const NEXT: readonly [PhosphorIcon, 'next_1' | 'next_2' | 'next_3'][] = [
	[BellIcon, 'next_1'],
	[ArrowsLeftRightIcon, 'next_2'],
	[ChatCircleIcon, 'next_3'],
];

/**
 * P6 confirmation (M9) after a lost report is published: what happens next, the responsible shelter with its call
 * button and the owner's duty to report (the app never replaces it), share and the report, the first-24-hours tips,
 * and the collapsed contribution row last. No ad (C15). The poster button comes with the poster (TASK-24.3).
 */
export function LostDone() {
	const t = useTranslations('report_lost');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { code, name } = useLocalSearchParams<{ code: string; name?: string }>();
	const { me, isVerified } = useSession();
	const report = useGetReportQuery({ code }).currentData;
	// The municipality the API derived for the report, else its point (C18 accepts both).
	const lookup = report
		? report.municipality_slug
			? { municipality: report.municipality_slug }
			: 'location' in report
				? report.location
				: null
		: null;

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<View className="h-14 flex-row items-center justify-end px-3">
				<Button variant="ghost" size="icon" aria-label={tc('close')} onPress={() => router.replace('/')}>
					<Icon as={XIcon} size={24} />
				</Button>
			</View>
			<ScrollView
				contentContainerClassName="grow px-5 pt-2"
				contentContainerStyle={{ paddingBottom: Math.max(44, insets.bottom + 8) }}
			>
				<Spot icon={MegaphoneIcon} />
				<View className="mt-6">
					<Heading>{t('done_title')}</Heading>
				</View>
				<Text className="mt-3 text-lg">{name ? t('done_lede_named', { name }) : t('done_lede')}</Text>
				{me && !isVerified ? (
					<Note icon={InfoIcon} className="mt-6">
						{t('unverified_note')}
					</Note>
				) : null}

				<Text role="heading" className="mt-10 font-display text-2xl tracking-[-0.36px]">
					{t('next_title')}
				</Text>
				<View className="mt-5 gap-4">
					{NEXT.map(([icon, key]) => (
						<View key={key} className="flex-row gap-3.5">
							<Icon as={icon} size={24} className="mt-0.5 text-primary" />
							<Text className="min-w-0 flex-1">{t(key)}</Text>
						</View>
					))}
				</View>

				<ShelterRow lookup={lookup} />

				<View className="mt-auto gap-1 pt-10">
					<View className="flex-row gap-2">
						<Button
							variant="text"
							className="flex-1"
							onPress={() => void Share.share({ message: reportLink(code) }).catch(() => undefined)}
						>
							<Icon as={ShareNetworkIcon} />
							{t('share')}
						</Button>
						<Button
							variant="text"
							className="flex-1"
							onPress={() => router.replace({ pathname: '/r/[code]', params: { code } })}
						>
							{t('open_report')}
						</Button>
					</View>
					<TextLink
						href={webUrl(locale, '/varnost#prvih-24-ur', '/en/safety#first-24-hours')}
						className="mt-2 self-center"
					>
						{t('first_24h')}
					</TextLink>
					<ContributionSlot reportId={report?.id} code={code} />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
