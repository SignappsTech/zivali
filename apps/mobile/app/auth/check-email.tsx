import { useLocalSearchParams, useRouter } from 'expo-router';
import { EnvelopeOpenIcon } from 'phosphor-react-native/src/icons/EnvelopeOpen';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { TrayIcon } from 'phosphor-react-native/src/icons/Tray';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { AuthScreen, ResendButton } from '@/components/auth/parts';
import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { openMailApp, resendConfirmation } from '@/lib/auth';

/**
 * P16 M4: after sign-up (`sent`, so resend starts cooling down) or a sign-in with an unconfirmed address. `convert`:
 * the link of a converted anonymous session is an email change (C7 §6).
 */
export default function CheckEmail() {
	const t = useTranslations('auth');
	const router = useRouter();
	const { email = '', sent, convert } = useLocalSearchParams<{ email?: string; sent?: string; convert?: string }>();
	return (
		<AuthScreen
			title={t('check_title')}
			spot={<Spot icon={EnvelopeSimpleIcon} />}
			footer={
				<>
					<Button size="lg" onPress={openMailApp}>
						<Icon as={EnvelopeOpenIcon} />
						{t('check_open_mail')}
					</Button>
					<ResendButton
						label={t('check_resend')}
						coolingDown={sent === '1'}
						onResend={() => resendConfirmation(email, convert === '1' ? 'email_change' : 'signup')}
					/>
					<Button variant="text" onPress={() => router.dismissTo('/auth/sign-up')}>
						{t('check_change')}
					</Button>
				</>
			}
		>
			<Text className="mt-3 text-lg">{t('check_body', { email })}</Text>
			<View className="mt-5 flex-row gap-2">
				<Icon as={TrayIcon} size={16} className="mt-0.5 text-muted-foreground" />
				<Text className="min-w-0 flex-1 text-sm text-muted-foreground">{t('check_spam')}</Text>
			</View>
		</AuthScreen>
	);
}
