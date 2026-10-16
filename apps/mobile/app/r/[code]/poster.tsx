import { useLocalSearchParams } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { FacebookLogoIcon } from 'phosphor-react-native/src/icons/FacebookLogo';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { LinkIcon } from 'phosphor-react-native/src/icons/Link';
import { QrCodeIcon } from 'phosphor-react-native/src/icons/QrCode';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { WhatsappLogoIcon } from 'phosphor-react-native/src/icons/WhatsappLogo';
import { WifiSlashIcon } from 'phosphor-react-native/src/icons/WifiSlash';
import * as React from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import type { Locale } from '@zivali/i18n/format';
import { BackButton, toDetail } from '@/app/r/[code]/index';
import { Note } from '@/components/report/parts';
import { ShareKit } from '@/components/report/share-kit';
import type { DetailReport } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Pill } from '@/components/ui/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { useReport } from '@/lib/data/reports';
import { env } from '@/lib/env';
import {
	copyText,
	kitTexts,
	posterBand,
	posterFileName,
	posterUrl,
	reportLink,
	shareFile,
	shareMessage,
	shareNative,
	shareWhatsApp,
	trackPosterDownload,
	trackShare,
} from '@/lib/share';
import { cn } from '@/lib/utils';

const LANGS: Locale[] = ['sl', 'en'];

/**
 * The A4 page as a 184 px thumbnail on a `card` frame (P18 screen 2): black on white in both themes (`qr` tokens),
 * the top band, the photo beside the QR column, the name. The PDF itself is the full-size view.
 */
function PosterPreview({ report, band, alt }: { report: DetailReport; band: string; alt: string }) {
	const photo = report.photos[0]?.url;
	return (
		<View className="items-center rounded-card bg-card p-5">
			<View
				accessible
				role="img"
				aria-label={alt}
				className="w-[184px] rounded-sm bg-qr p-[11px]"
				style={{ aspectRatio: 210 / 297 }}
			>
				<Text numberOfLines={1} className="font-display text-[21px] leading-[22px] text-qr-foreground">
					{band}
				</Text>
				<View className="mt-1.5 flex-1 flex-row gap-[7px]">
					<View className="flex-1 overflow-hidden rounded-[4px] bg-input">
						{photo && <Image source={{ uri: photo }} resizeMode="cover" className="flex-1" />}
					</View>
					<View className="w-14 items-center justify-end">
						<Icon as={QrCodeIcon} size={52} className="text-qr-foreground" />
					</View>
				</View>
				{report.name ? (
					<Text
						numberOfLines={1}
						className="mt-1.5 font-display text-[20px] leading-[22px] text-qr-foreground"
					>
						{report.name}
					</Text>
				) : null}
				<View className="mt-2 h-1.5 w-3/4 rounded-full bg-input" />
				<View className="mt-1 h-1.5 w-1/2 rounded-full bg-input" />
			</View>
		</View>
	);
}

/** A 64 px share row on `card` (P18 share rows, the `choice` look): icon 24 in `primary`, label 17 bold. */
function ShareRow({ icon, label, onPress }: { icon: PhosphorIcon; label: string; onPress: () => void }) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	return (
		<Pressable
			role="button"
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'min-h-16 flex-row items-center gap-3.5 rounded-row bg-card px-5 py-3 active:bg-accent',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			<Icon as={icon} size={24} className="text-primary" />
			<Text className="min-w-0 flex-1 font-sans-bold text-control-lg">{label}</Text>
		</Pressable>
	);
}

function Poster({ report, offline }: { report: DetailReport; offline: boolean }) {
	const t = useTranslations('poster');
	const ts = useTranslations('share');
	const tc = useTranslations('common');
	const tr = useTranslations('report');
	const locale = useLocale();
	const [lang, setLang] = React.useState<Locale>(locale);
	const [download, setDownload] = React.useState<'idle' | 'busy' | 'failed'>('idle');
	const [cardFailed, setCardFailed] = React.useState(false);
	const active = report.status === 'open' || report.status === 'matched';
	const { data: place } = useReversePlaceQuery(
		{ lat: report.area.lat, lng: report.area.lng },
		{ skip: offline || !active }
	);

	if (report.status === 'closed')
		return (
			<Note role="status" icon={ArchiveIcon} iconClassName="text-foreground" className="mt-2">
				{t('unavailable_closed')}
			</Note>
		);

	const code = report.short_code;
	const url = reportLink(code);
	const ctx = { report, area: place?.label, locale: lang };
	const message = shareMessage(ctx);
	const kit = report.is_mine && active ? kitTexts(ctx) : null;
	const band = posterBand(report, lang);
	const title = [band, report.name].filter(Boolean).join(' ');
	const noPhoto = report.photos.length === 0;

	const downloadPoster = async () => {
		setDownload('busy');
		try {
			await shareFile(posterUrl(code, lang), posterFileName(code), 'pdf');
			trackPosterDownload(report);
			setDownload('idle');
		} catch {
			setDownload('failed');
		}
	};
	const copyLink = async () => {
		await copyText(url);
		toast.success(ts('copied'));
		trackShare('copy_link', report);
	};
	const shareFacebook = async () => {
		try {
			await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
			trackShare('facebook', report);
		} catch {
			await shareNative(report, message);
		}
	};

	return (
		<>
			<Label nativeID="poster-language">{t('language_label')}</Label>
			<View role="radiogroup" aria-labelledby="poster-language" className="mt-2 flex-row gap-2">
				{LANGS.map((l) => (
					<Pill
						key={l}
						role="radio"
						selected={lang === l}
						onPress={() => {
							setLang(l);
							if (download === 'failed') setDownload('idle');
						}}
					>
						{t(`language_${l}`)}
					</Pill>
				))}
			</View>

			{download === 'failed' ? (
				<Note
					role="alert"
					icon={WarningCircleIcon}
					iconClassName="text-destructive"
					className="mt-5"
					action={
						<Button variant="text" size="sm" onPress={() => void downloadPoster()}>
							<Icon as={ArrowClockwiseIcon} />
							{tc('try_again')}
						</Button>
					}
				>
					{t('failed')}
				</Note>
			) : download === 'busy' ? (
				<View aria-hidden className="mt-5 items-center rounded-card bg-card p-5">
					<Skeleton className="w-[184px] rounded-sm" style={{ aspectRatio: 210 / 297 }} />
				</View>
			) : (
				<View className="mt-5">
					<PosterPreview report={report} band={band} alt={t('preview_alt', { title })} />
				</View>
			)}

			{noPhoto ? (
				<Note icon={ImageIcon} className="mt-5">
					{t('no_photo')}
				</Note>
			) : (
				<>
					{offline && (
						<Note role="status" icon={WifiSlashIcon} iconClassName="text-foreground" className="mt-5">
							{tr('action_offline')}
						</Note>
					)}
					<Button
						size="lg"
						className="mt-6"
						loading={download === 'busy'}
						disabled={offline || download === 'failed'}
						aria-live="polite"
						onPress={() => void downloadPoster()}
					>
						<Icon as={DownloadSimpleIcon} />
						{download === 'busy' ? t('preparing') : t('download')}
					</Button>
					<Text
						aria-hidden={download === 'busy'}
						className="mt-2 text-center text-sm tabular-nums text-muted-foreground"
					>
						{download === 'busy' ? ' ' : t('ready_file', { filename: posterFileName(code) })}
					</Text>
				</>
			)}

			<Text role="heading" className="mt-10 font-display text-2xl tracking-[-0.36px]">
				{ts('title')}
			</Text>
			<View role="list" className="mt-4 gap-2">
				<ShareRow
					icon={WhatsappLogoIcon}
					label={ts('whatsapp')}
					onPress={() => void shareWhatsApp(report, message)}
				/>
				<ShareRow icon={FacebookLogoIcon} label={ts('facebook')} onPress={() => void shareFacebook()} />
				<ShareRow icon={LinkIcon} label={ts('copy')} onPress={() => void copyLink()} />
				<ShareRow
					icon={ShareNetworkIcon}
					label={ts('more')}
					onPress={() => void shareNative(report, message)}
				/>
			</View>

			{!offline && !cardFailed && (
				// The link card WhatsApp and Facebook show (the web OG image): photo and type, never a location.
				<View className="mt-6">
					<Image
						source={{ uri: `${url}/opengraph-image` }}
						aria-hidden
						className="w-full rounded-row bg-muted"
						style={{ aspectRatio: 1200 / 630 }}
						onError={() => setCardFailed(true)}
					/>
					<Text className="mt-3 font-sans-bold">{title}</Text>
					<Text className="text-sm text-muted-foreground">
						{env.EXPO_PUBLIC_APP_URL.replace(/^https?:\/\//, '')}
					</Text>
				</View>
			)}
			<View className="mt-5 flex-row gap-2">
				<Icon as={QrCodeIcon} size={18} className="mt-px text-muted-foreground" />
				<Text className="min-w-0 flex-1 text-sm text-muted-foreground">{t('qr_note')}</Text>
			</View>

			{kit && <ShareKit report={report} texts={kit} lang={lang} title={title} />}
		</>
	);
}

/**
 * P18 "Plakat in deljenje" (`r/[code]/poster`, from the owner's "Plakat" in slot A): poster language, the A4 preview,
 * "Prenesi PDF" (the web poster PDF, C15, downloaded with expo-file-system and offered through expo-sharing), the share
 * rows and, for the owner of a lost report, the Facebook and local media kit. Texts follow the poster language. The
 * saved copy offline keeps sharing the link; the download needs the network. Closed reports have no poster.
 */
export default function PosterScreen() {
	const params = useLocalSearchParams<{ code?: string | string[] }>();
	const code = (Array.isArray(params.code) ? params.code[0] : params.code) ?? '';
	const { data, source, isLoading, refetch } = useReport(code);
	const t = useTranslations('poster');
	const tc = useTranslations('common');
	const insets = useSafeAreaInsets();

	return (
		<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
			<View className="h-14 flex-row items-center gap-2 px-3">
				<BackButton />
				<Text role="heading" className="min-w-0 flex-1 font-display-semibold text-lg">
					{t('screen_title')}
				</Text>
			</View>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pt-2"
				contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
			>
				{isLoading ? (
					<View accessible aria-label={tc('loading')} aria-busy className="gap-3">
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-11 w-60" />
						<Skeleton className="mt-3 h-[300px] rounded-card" />
					</View>
				) : data ? (
					<Poster report={toDetail(data)} offline={source === 'cache'} />
				) : (
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
				)}
			</ScrollView>
		</View>
	);
}
