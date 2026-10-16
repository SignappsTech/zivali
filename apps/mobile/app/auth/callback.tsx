import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { LinkBreakIcon } from 'phosphor-react-native/src/icons/LinkBreak';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { AuthScreen, useLeaveAuth } from '@/components/auth/parts';
import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { exchangeLinkCode, isRecovering } from '@/lib/auth';

/**
 * Where confirmation and reset emails land (zivali://auth/callback?type=…&code=…, see authRedirect). The code becomes
 * a session on this device; a reset continues to the new password, a confirmation shows P16 M5. GoTrue confirms the
 * address before it issues the code, so a confirmation opened on another device (no PKCE verifier here) still counts.
 * A converted finder's link with `next` (C7 §6: the password did not go with the address) continues to the new
 * password too; on another device it is the plain confirmation, and "Pozabljeno geslo?" sets the password.
 */
export default function AuthCallback() {
	const t = useTranslations('auth');
	const tc = useTranslations('common');
	const router = useRouter();
	const leave = useLeaveAuth();
	const { session } = useSession();
	const { code, type, next } = useLocalSearchParams<{ code?: string; type?: string; next?: string }>();
	const [state, setState] = React.useState<'loading' | 'verified' | 'failed'>(code ? 'loading' : 'failed');
	const started = React.useRef(false);

	React.useEffect(() => {
		if (!code || started.current) return;
		started.current = true;
		exchangeLinkCode(code, type, next).then(
			() => (isRecovering() ? router.replace('/auth/new-password') : setState('verified')),
			() => setState(type === 'signup' ? 'verified' : 'failed')
		);
	}, [code, type, next, router]);

	if (state === 'loading')
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator aria-label={tc('loading')} className="text-primary" size="large" />
			</View>
		);

	if (state === 'verified')
		return (
			<AuthScreen
				title={t('verified_title')}
				closable={false}
				spot={<Spot icon={CheckIcon} />}
				footer={
					<Button size="lg" onPress={session ? leave : () => router.replace('/auth/sign-in')}>
						{t('verified_continue')}
					</Button>
				}
			>
				<Text className="mt-3 text-lg">{t('verified_body')}</Text>
			</AuthScreen>
		);

	const recovery = type === 'recovery';
	return (
		<AuthScreen
			title={t('link_failed_title')}
			spot={<Spot icon={LinkBreakIcon} />}
			footer={
				<Button size="lg" onPress={() => router.replace(recovery ? '/auth/forgot-password' : '/auth/sign-in')}>
					{t(recovery ? 'forgot_button' : 'signin_button')}
				</Button>
			}
		>
			<Text className="mt-3 text-lg">{t('link_failed_body')}</Text>
		</AuthScreen>
	);
}
