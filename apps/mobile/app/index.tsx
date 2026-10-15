import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { Text } from '@/lib/font-scale';

// Placeholder start screen; the mobile shell (TASK-12.2) replaces it with the tabs.
export default function Home() {
	const t = useTranslations('pages.home');

	return (
		<View className="flex-1 items-center justify-center gap-2 bg-background px-4">
			<Text role="heading" className="font-display text-3xl tracking-tight text-foreground">
				{t('hero_title')}
			</Text>
			<Text className="font-sans text-base text-muted-foreground">{t('hero_lede')}</Text>
		</View>
	);
}
