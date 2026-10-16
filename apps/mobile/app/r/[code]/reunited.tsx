import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { type Href, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { Image, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { StatusWord } from '@/components/report/parts';
import { ReunitedAd, ReunitedTip } from '@/components/report/reunited-slots';
import { reportLink } from '@/lib/share';
import type { DetailReport } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useReport } from '@/lib/data/reports';
import { cn } from '@/lib/utils';

// P14 reunited screen (C15 `r/[code]/reunited`, managers only): the owner's calm celebration with the story consent,
// the tip and ad slots and "Končano"; a finder gets the short thank-you (M7: no tip, no ad). No confetti, no motion.

function TopBar({ onClose }: { onClose: () => void }) {
	const tc = useTranslations('common');
	return (
		<View className="h-14 flex-row items-center justify-end px-3">
			<Button variant="ghost" size="icon" aria-label={tc('close')} onPress={onClose}>
				<Icon as={XIcon} size={24} />
			</Button>
		</View>
	);
}

/** The h1 takes screen reader focus on arrival (P14 accessibility). */
function Heading({ children, className }: { children: string; className?: string }) {
	const ref = useAccessibilityFocus<React.ComponentRef<typeof Text>>();
	return (
		<Text
			ref={ref}
			role="heading"
			className={cn('font-display text-[30px] leading-9 tracking-[-0.6px]', className)}
		>
			{children}
		</Text>
	);
}

/**
 * M3, top to bottom: the pet photo (its own 4:3 frame), h1 with the name, one warm sentence, the story switch (off by
 * default: explicit consent, A-023), the tip slot (P15), the one ad slot (P21), "Končano" to the map and "Delite veselo
 * novico". The spot illustration above the photo joins when assets/reunited-celebration.png exists (TASK-26.1).
 */
function OwnerReunited({ report, onClose }: { report: DetailReport; onClose: () => void }) {
	const tl = useTranslations('lifecycle');
	const tb = useTranslations('browse');
	const router = useRouter();
	const [story, setStory] = React.useState(false);
	const photo = report.photos[0];
	const shareText = report.name ? tl('share_text_named', { name: report.name }) : tl('share_text');
	const share = () =>
		void Share.share({ message: `${shareText} ${reportLink(report.short_code)}` }).catch(() => undefined);
	// The consent stays on this screen for now: C4 has no field for it yet (CHANGE request); success stories are M5.
	const onStory = (on: boolean) => setStory(on);

	return (
		<SafeAreaView className="flex-1 bg-background">
			<TopBar onClose={onClose} />
			<ScrollView contentContainerClassName="px-5 pb-11 pt-2">
				{photo ? (
					<Image
						source={{ uri: photo.url }}
						role="img"
						accessible
						aria-label={report.name ?? tb(`row_title_${report.type}`, { species: report.species })}
						className="aspect-[4/3] w-full rounded-[24px] bg-muted"
					/>
				) : null}
				<Heading className={photo ? 'mt-8' : undefined}>
					{report.name ? tl('home_title_named', { name: report.name }) : tl('home_title')}
				</Heading>
				<Text className="mt-3 text-lg leading-7">{tl('home_body')}</Text>

				<View className="mt-8 rounded-row bg-card p-5">
					<Switch
						label={tl('story_label')}
						checked={story}
						onCheckedChange={onStory}
						accessibilityHint={tl('story_help')}
					/>
					<Text aria-hidden className="mt-2 text-sm text-muted-foreground">
						{tl('story_help')}
					</Text>
				</View>

				<ReunitedTip report={report} className="mt-12" />
				<ReunitedAd report={report} className="mt-12" />

				<View className="mt-12 gap-1">
					<Button size="lg" onPress={() => router.replace('/' as Href)}>
						{tl('done')}
					</Button>
					<Button variant="text" onPress={share}>
						<Icon as={ShareNetworkIcon} />
						{tl('share_news')}
					</Button>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

/** M7: the status word, one line of thanks; an anonymous finder gets the quiet account offer, nothing else. */
function FinderThanks({ report, onClose }: { report: DetailReport; onClose: () => void }) {
	const tl = useTranslations('lifecycle');
	const router = useRouter();
	const { isAnonymous } = useSession();
	return (
		<SafeAreaView className="flex-1 bg-background">
			<TopBar onClose={onClose} />
			<View className="flex-1 px-5 pt-16">
				<StatusWord report={report} />
				<Heading className="mt-2">{tl('finder_thanks_title')}</Heading>
				<Text className="mt-3 text-lg leading-7">{tl('finder_thanks_body')}</Text>
			</View>
			{isAnonymous ? (
				<View className="px-5 pb-11">
					<Button
						variant="text"
						onPress={() => router.push({ pathname: '/auth/sign-up', params: { convert: '1' } })}
					>
						{tl('finder_thanks_account')}
					</Button>
				</View>
			) : null}
		</SafeAreaView>
	);
}

export default function ReunitedScreen() {
	const params = useLocalSearchParams<{ code?: string | string[] }>();
	const code = (Array.isArray(params.code) ? params.code[0] : params.code) ?? '';
	const router = useRouter();
	const { data, isLoading } = useReport(code);
	if (isLoading) return <View className="flex-1 bg-background" />;
	const report = data as DetailReport | null | undefined;
	// Managers of a reunited report only; anyone else, or a report reopened meanwhile, gets the report page.
	if (!report?.is_mine || report.status !== 'reunited') return <Redirect href={`/r/${code}` as Href} />;
	// Close returns to the report, which now shows the reunited variant.
	const close = () => (router.canGoBack() ? router.back() : router.replace(`/r/${code}` as Href));
	return report.manager_role === 'owner' ? (
		<OwnerReunited report={report} onClose={close} />
	) : (
		<FinderThanks report={report} onClose={close} />
	);
}
