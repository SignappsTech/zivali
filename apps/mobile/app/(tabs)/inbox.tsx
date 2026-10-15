import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { SignInButtons, Spot } from '@/components/shell/parts';
import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';

// Inbox tab (P2 A3 signed out). Conversations and notifications fill it in TASK-21.4 and TASK-22.5.
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
		<SafeAreaView edges={['top']} className="flex-1 bg-background px-5 pt-6">
			<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
				{t('nav.tab_inbox')}
			</Text>
			<EmptyState className="mt-10" title={t('common.empty_title')} description={t('common.empty_body')} />
		</SafeAreaView>
	);
}
