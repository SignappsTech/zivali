import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { NotificationsView } from '@/components/notifications/notifications-view';
import { SignInButtons, Spot } from '@/components/shell/parts';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

// Inbox tab (P2 A3 signed out; P13 notifications view signed in). TASK-21.4 adds the conversations view beside it.
export default function InboxTab() {
	const t = useTranslations();
	const { session, isAnonymous, loading } = useSession();
	if (loading) return <View className="flex-1 bg-background" />;

	if (!session || isAnonymous) {
		return (
			<SafeAreaView edges={['top']} className="flex-1 bg-background px-5">
				<View className="flex-1 justify-center">
					<Spot icon={ChatCircleIcon} />
					<Text role="heading" className="mt-8 font-display text-3xl tracking-[-0.6px]">
						{t('inbox.signed_out_title')}
					</Text>
					<Text className="mt-3 text-lg">{t('inbox.signed_out_body')}</Text>
					<View className="mt-5 flex-row items-center gap-2">
						<Icon as={HandHeartIcon} size={16} className="text-muted-foreground" />
						<Text className="flex-1 text-sm text-muted-foreground">{t('inbox.signed_out_note')}</Text>
					</View>
				</View>
				<SignInButtons
					className="pb-6"
					signIn={t('inbox.signed_out_sign_in')}
					create={t('inbox.signed_out_create')}
				/>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<NotificationsView />
		</SafeAreaView>
	);
}
