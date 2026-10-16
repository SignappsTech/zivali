import * as WebBrowser from 'expo-web-browser';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { type EventParams, track } from '@zivali/analytics';
import { useAd, useRecordAdImpressionMutation } from '@zivali/api/ads';
import type { Ad, AdSlot as Slot, Locale, Species } from '@zivali/types';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { isOnline, useNetworkState } from '@/lib/net';
import { cn } from '@/lib/utils';

type InlineSlot = Exclude<Slot, 'sidebar'>;
type Region = EventParams['ad_impression']['region'];

/** P21 reserved sizes, so nothing shifts when the ad arrives: the feed row 88 px, the detail and reunited units 136. */
const RESERVED = { feed: 'min-h-[88px]', detail: 'min-h-[136px]', reunited: 'min-h-[136px]' } as const;

/**
 * Only our click counter (C14 `click_url`, which redirects to the stored https link) opens, and only over https
 * (plain http is allowed for the local API alone). Anything else is dropped, never opened.
 */
export const isSafeClickUrl = (url: string): boolean =>
	url.startsWith(`${env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '')}/v1/ads/`) &&
	(url.startsWith('https://') || env.EXPO_PUBLIC_APP_ENV === 'local');

/** C12 `ad_impression` / `ad_click`: slot, ad id and, beside a report, its region and species. */
const gaParams = (ad_slot: InlineSlot, ad_id: string, species?: Species, region?: string) => ({
	ad_slot,
	ad_id,
	...(region && { region: region as Region }),
	...(species && { species }),
});

/** "Oglas: title. body": the label once and the full text, even when the lines are clamped (P21, content §4). */
const a11yName = (label: string, body: string) => `${label}${/[.?!]$/.test(label) ? ' ' : '. '}${body}`;

/**
 * P21 AdSlot (feed, detail, reunited): one labelled "Oglas" unit on `muted`, radius 20, no border, shadow or motion;
 * the whole unit is one link that opens the C14 click URL in the in-app browser. Loading keeps the reserved box
 * (empty, hidden from screen readers); no ad, an error, a blocked request or no network collapse it with no gap and
 * no message, so a cached ad is never shown as live. The impression goes to our DB once per rendered unit (A-016);
 * `ad_impression` and `ad_click` reach GA only with consent (`track()` is a no-op without it, C12). Never place it in
 * the report flows, manage, chat, sign-in or payments (C15; guarded by `__tests__/ad-slot.test.tsx`).
 */
export function AdSlot({
	slot,
	species,
	region,
	className,
}: {
	slot: InlineSlot;
	/** Targeting and GA context of the report the slot sits beside. */
	species?: Species;
	region?: string;
	className?: string;
}) {
	const locale = useLocale() as Locale;
	const online = isOnline(useNetworkState());
	const { ad, loading } = useAd(slot, { locale, ...(species && { species }) });
	const [record] = useRecordAdImpressionMutation();

	// Once per rendered ad (A-016): our aggregate count always, GA only with consent.
	const shownId = online ? ad?.id : undefined;
	React.useEffect(() => {
		if (!shownId) return;
		void record({ id: shownId, body: { slot } });
		track('ad_impression', gaParams(slot, shownId, species, region));
	}, [shownId, slot, species, region, record]);

	if (!online) return null;
	if (!ad) return loading ? <View aria-hidden className={cn(RESERVED[slot], className)} /> : null;

	const open = () => {
		if (!isSafeClickUrl(ad.click_url)) return;
		track('ad_click', gaParams(slot, ad.id, species, region));
		void WebBrowser.openBrowserAsync(ad.click_url).catch(() => undefined);
	};
	return <AdUnit ad={ad} slot={slot} onPress={open} className={className} />;
}

function AdUnit({
	ad,
	slot,
	onPress,
	className,
}: {
	ad: Ad;
	slot: InlineSlot;
	onPress: () => void;
	className?: string;
}) {
	const t = useTranslations('ads');
	const focus = useFocusRing();
	const label = (
		<Text className="font-sans-bold text-xs leading-4 text-muted-foreground">{t('label')}</Text>
	);
	const title = (lines: number) => (
		<Text numberOfLines={lines} className="font-display-semibold text-lg leading-6 tracking-[-0.18px]">
			{ad.title}
		</Text>
	);
	const image = (size: string) =>
		ad.image_url ? (
			<Image source={{ uri: ad.image_url }} alt={ad.image_alt} className={cn(size, 'rounded-row bg-card')} />
		) : null;
	const feed = slot === 'feed';

	return (
		<Pressable
			role="link"
			aria-label={a11yName(t('unit_a11y', { title: ad.title }), ad.body)}
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'rounded-row bg-muted active:bg-foreground/10',
				feed ? 'flex-row items-center gap-3 p-3' : 'p-4',
				RESERVED[slot],
				className
			)}
		>
			{feed ? (
				<>
					{image('size-16')}
					<View className="min-w-0 flex-1">
						{label}
						{title(1)}
						<Text numberOfLines={1}>{ad.body}</Text>
					</View>
					<Icon as={CaretRightIcon} weight="bold" size={20} className="text-muted-foreground" />
				</>
			) : (
				<>
					{label}
					<View className="mt-2 flex-row items-start gap-4">
						{image('size-24')}
						<View className="min-w-0 flex-1">
							{title(2)}
							<Text numberOfLines={2}>{ad.body}</Text>
							{/* The unit is the link: this is its visible text button, not a second target. */}
							<View className="-ml-3 mt-1 min-h-11 justify-center self-start px-3">
								<Text className="font-sans-bold text-primary">{ad.cta || t('learn_more')}</Text>
							</View>
						</View>
					</View>
				</>
			)}
		</Pressable>
	);
}
