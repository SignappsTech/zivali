import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { EmptyState } from '@/components/ui/empty-state';

// Placeholders of the settings stack (C15). A story adds `app/settings/<section>.tsx`, which wins over this route:
// notifications TASK-22.5, alerts TASK-23.3, payments TASK-32.3 (account and home-area exist).
const TITLES = {
	notifications: 'alerts.channels_title',
	alerts: 'alerts.title',
	payments: 'profile.row_payments',
} as const;

export default function SettingsPlaceholder() {
	const t = useTranslations();
	const { section } = useLocalSearchParams<{ section: string }>();
	const title = TITLES[section as keyof typeof TITLES];
	if (!title) return <Redirect href="/profile" />;
	return (
		<View className="flex-1 bg-background px-5 pt-6">
			<Stack.Screen options={{ title: t(title) }} />
			<EmptyState title={t('common.empty_title')} description={t('common.empty_body')} />
		</View>
	);
}
