import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { OutboxList } from '@/components/outbox/queue';
import { Text } from '@/lib/font-scale';

// Map tab placeholder; TASK-31.5 replaces it with the map and its list sheet (no top bar on this screen) and keeps the
// outbox group at the top of the sheet (P7 C6).
export default function MapTab() {
	const t = useTranslations('pages.home');

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<ScrollView contentContainerClassName="grow px-5 pb-8 pt-6">
				<OutboxList recent />
				<View className="flex-1 items-center justify-center gap-2">
					<Text role="heading" className="font-display text-3xl tracking-tight text-foreground">
						{t('hero_title')}
					</Text>
					<Text className="font-sans text-base text-muted-foreground">{t('hero_lede')}</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
