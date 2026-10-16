import { skipToken } from '@reduxjs/toolkit/query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowsLeftRightIcon } from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { MegaphoneIcon } from 'phosphor-react-native/src/icons/Megaphone';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useGetReportQuery } from '@zivali/api/reports';
import type { Locale } from '@zivali/i18n/format';
import { ContributionRow } from '@/components/payments/support';
import { ShelterRow } from '@/components/shelter/shelter-row';
import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { shareMessage, shareNative } from '@/lib/share';

import { Heading, Note } from './parts';

/** A page of the web app (C15): the directory index, one shelter's page, or the safety tips. */
const webUrl = (locale: Locale, sl: string, en: string) => `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? en : sl}`;

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

const NEXT: readonly [PhosphorIcon, 'next_1' | 'next_2' | 'next_3'][] = [
	[BellIcon, 'next_1'],
	[ArrowsLeftRightIcon, 'next_2'],
	[ChatCircleIcon, 'next_3'],
];

/**
 * P6 confirmation (M9) after a lost report is published: what happens next, the responsible shelter with its call
 * button and the owner's duty to report (the app never replaces it), share and the report, the first-24-hours tips,
 * and the collapsed contribution row last. The poster and the share text are P18's (TASK-24.3). No ad (C15).
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
	// The area name for the P18 share text (the reverse lookup of the public circle); without it the text is the link.
	const place = useReversePlaceQuery(report ? { lat: report.area.lat, lng: report.area.lng } : skipToken).currentData;
	// The municipality the API derived for the report, else its point (C18 accepts both).
	const point = report && 'location' in report ? report.location : null;

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

				<ShelterRow
					point={point}
					municipality={report?.municipality_slug ?? undefined}
					kind="lost"
					className="mt-8"
				/>

				<View className="mt-auto gap-1 pt-10">
					<Button size="lg" onPress={() => router.push({ pathname: '/r/[code]/poster', params: { code } })}>
						<Icon as={DownloadSimpleIcon} />
						{t('poster')}
					</Button>
					<View className="flex-row gap-2">
						<Button
							variant="text"
							className="flex-1"
							disabled={!report}
							onPress={() =>
								report && void shareNative(report, shareMessage({ report, area: place?.label, locale }))
							}
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
					<ContributionRow reportId={report?.id} code={code} className="mt-6" />
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
