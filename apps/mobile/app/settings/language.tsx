import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { LanguageChoice } from '@/components/shell/language';

export default function LanguageSettings() {
	const t = useTranslations('profile');
	return (
		<View className="flex-1 bg-background px-5 pt-6">
			<Stack.Screen options={{ title: t('row_language') }} />
			<LanguageChoice />
		</View>
	);
}
