import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { CopyIcon } from 'phosphor-react-native/src/icons/Copy';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { FacebookLogoIcon } from 'phosphor-react-native/src/icons/FacebookLogo';
import { RadioIcon } from 'phosphor-react-native/src/icons/Radio';
import * as React from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import { useGetPublicConfigQuery } from '@zivali/api/config';
import type { Locale } from '@zivali/i18n/format';
import type { DetailReport } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { copyText, parseShareConfig, shareFile, squareImageUrl, trackShare } from '@/lib/share';

/** A 64 px external link row on `card` (P18 group rows): icon, label, the external-link mark. */
function LinkRow({ icon, label, url }: { icon: PhosphorIcon; label: string; url: string }) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	return (
		<Pressable
			role="link"
			onPress={() => void Linking.openURL(url).catch(() => undefined)}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'min-h-16 flex-row items-center gap-3.5 rounded-row bg-card py-2.5 pl-[18px] pr-4 active:bg-foreground/10',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			<Icon as={icon} size={24} className="text-primary" />
			<Text className="min-w-0 flex-1 font-sans-bold">{label}</Text>
			<Icon as={ArrowSquareOutIcon} size={20} />
		</Pressable>
	);
}

/** A ready text, read-only and selectable, on the line field style (16/24, 2 px `input` underline). */
function ReadyText({ children }: { children: string }) {
	return (
		<Text selectable className="mt-3 border-b-2 border-input px-0.5 py-2.5">
			{children}
		</Text>
	);
}

type Props = {
	report: DetailReport;
	texts: { post: string; media: string };
	/** The poster language: the square image is rendered in it, like the texts. */
	lang: Locale;
	title: string;
};

/**
 * The owner's Facebook and local media kit (P18 M6, content §4b), under the share rows: the ready post text, the
 * 1080 × 1080 image (saved through the share sheet), the lost-pet groups on Facebook from the public config (the
 * report's region first) and the local radio text with its announcement form. Contact runs only through the link.
 */
export function ShareKit({ report, texts, lang, title }: Props) {
	const t = useTranslations('share');
	const tc = useTranslations('common');
	const { data: config } = useGetPublicConfigQuery();
	const { groups, radioFormUrl } = parseShareConfig(config, report.region_slug);
	const [saving, setSaving] = React.useState(false);
	const image = squareImageUrl(report.short_code, lang);

	const copy = async (text: string, facebook: boolean) => {
		await copyText(text);
		toast.success(t('kit_copied'));
		if (facebook) trackShare('facebook', report);
	};
	const save = async () => {
		setSaving(true);
		try {
			await shareFile(image, `najdimo-${report.short_code}.png`, 'png');
		} catch {
			toast.error(tc('inline_error'));
		} finally {
			setSaving(false);
		}
	};

	return (
		<View className="mt-12">
			<Text role="heading" className="font-display text-2xl tracking-[-0.36px]">
				{t('kit_title')}
			</Text>
			<Text className="mt-2">{t('kit_intro')}</Text>

			<Text role="heading" className="mt-8 font-display-semibold text-xl">
				{t('kit_post_title')}
			</Text>
			<ReadyText>{texts.post}</ReadyText>
			<Button size="lg" className="mt-4" onPress={() => void copy(texts.post, true)}>
				<Icon as={CopyIcon} />
				{t('kit_copy')}
			</Button>
			<View className="mt-6 flex-row items-center gap-4">
				<Image
					source={{ uri: image }}
					role="img"
					accessible
					aria-label={t('kit_image_alt', { title })}
					className="size-[90px] rounded-row bg-muted"
				/>
				<View className="min-w-0 flex-1 items-start">
					<Text className="font-sans-bold">{t('kit_image_title')}</Text>
					<Text className="text-sm tabular-nums text-muted-foreground">1080 × 1080</Text>
					<Button variant="secondary" size="sm" className="mt-2" loading={saving} onPress={() => void save()}>
						<Icon as={DownloadSimpleIcon} />
						{t('kit_image_save')}
					</Button>
				</View>
			</View>

			<Text role="heading" className="mt-8 font-display-semibold text-xl">
				{t('kit_groups_title')}
			</Text>
			<Text className="mt-2">{t('kit_groups_intro')}</Text>
			<Text className="mt-2 text-sm text-muted-foreground">{t('kit_groups_hint')}</Text>
			{groups.length > 0 && (
				<View role="list" className="mt-3 gap-2">
					{groups.map((group) => (
						<LinkRow key={group.url} icon={FacebookLogoIcon} label={group.name} url={group.url} />
					))}
				</View>
			)}

			<Text role="heading" className="mt-8 font-display-semibold text-xl">
				{t('kit_media_title')}
			</Text>
			<Text className="mt-2">{t('kit_media_intro')}</Text>
			<ReadyText>{texts.media}</ReadyText>
			<Button variant="secondary" className="mt-4" onPress={() => void copy(texts.media, false)}>
				<Icon as={CopyIcon} />
				{t('kit_copy')}
			</Button>
			<Text className="mt-2 text-sm text-muted-foreground">{t('kit_media_hint')}</Text>
			{radioFormUrl && (
				<View className="mt-3">
					<LinkRow icon={RadioIcon} label={t('kit_media_form')} url={radioFormUrl} />
				</View>
			)}
		</View>
	);
}
