import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { useRouter } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { LinkBreakIcon } from 'phosphor-react-native/src/icons/LinkBreak';
import { MapTrifoldIcon } from 'phosphor-react-native/src/icons/MapTrifold';
import { ScrollView, type Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/**
 * P2 C3 invalid link (neutral, no error colour): any route without a screen, e.g. a malformed or outdated link, lands
 * here instead of Expo Router's Unmatched view. One primary, "Odpri zemljevid"; after a deep link back opens the map too.
 */
export default function NotFound() {
	const t = useTranslations('deeplink');
	const tc = useTranslations('common');
	const router = useRouter();
	const heading = useAccessibilityFocus<RNText>();
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="h-14 flex-row items-center px-2">
				<Button
					variant="ghost"
					size="icon"
					aria-label={tc('back')}
					onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
				>
					<Icon as={CaretLeftIcon} size={24} />
				</Button>
			</View>
			<ScrollView contentContainerClassName="grow px-5 pb-6">
				<View className="flex-1 justify-center">
					<Spot icon={LinkBreakIcon} />
					<Text ref={heading} role="heading" className="mt-8 font-display text-3xl tracking-[-0.6px]">
						{t('invalid_title')}
					</Text>
					<Text className="mt-3 text-lg">{t('invalid_body')}</Text>
				</View>
				<Button size="lg" className="mt-6" onPress={() => router.replace('/')}>
					<Icon as={MapTrifoldIcon} />
					{t('invalid_action')}
				</Button>
			</ScrollView>
		</SafeAreaView>
	);
}
