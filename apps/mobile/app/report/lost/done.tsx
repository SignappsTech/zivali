import { useAccessibilityFocus } from '@rn-primitives/hooks';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type Text as RNText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

/**
 * After publishing a lost report: the h1 and the lede. TASK-29.6 builds the full P6 confirmation (next steps, the
 * responsible shelter, poster, share, the collapsed support row) on this route. No ad.
 */
export default function ReportLostDoneScreen() {
	const t = useTranslations('report_lost');
	const tc = useTranslations('common');
	const router = useRouter();
	const { name } = useLocalSearchParams<{ code: string; name?: string }>();
	const heading = useAccessibilityFocus<RNText>();
	return (
		<SafeAreaView className="flex-1 bg-background px-5">
			<View className="flex-1 justify-center">
				<Text
					ref={heading}
					role="heading"
					className="font-display text-[34px] leading-[40px] tracking-[-0.68px]"
				>
					{t('done_title')}
				</Text>
				<Text className="mt-3 text-lg">{name ? t('done_lede_named', { name }) : t('done_lede')}</Text>
			</View>
			<Button size="lg" className="mb-11" onPress={() => router.replace('/')}>
				{tc('done')}
			</Button>
		</SafeAreaView>
	);
}
