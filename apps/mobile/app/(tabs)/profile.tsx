import { useRouter } from 'expo-router';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellRingingIcon } from 'phosphor-react-native/src/icons/BellRinging';
import { CookieIcon } from 'phosphor-react-native/src/icons/Cookie';
import { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import * as React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { useSession } from '@zivali/api/auth';
import { LanguageRow } from '@/components/shell/language';
import { MenuRow, SignInButtons } from '@/components/shell/parts';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { signOutAndWipe } from '@/lib/offline/wipe';

/** "Odjava" and its confirmation; the wipe keeps the manage links unless the user ticks their removal (C17 §Wipe). */
function SignOutRow() {
	const t = useTranslations();
	const [removeManageLinks, setRemoveManageLinks] = React.useState(false);
	const signOut = async () => {
		try {
			// TASK-86.2 adds the "Send now / Delete / Cancel" prompt; until then unsent items stay in the outbox.
			await signOutAndWipe({ resolvePending: async () => true, removeManageLinks });
		} catch {
			toast.error(t('errors.INTERNAL'));
		}
	};
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<MenuRow icon={<Icon as={SignOutIcon} size={24} />} title={t('profile.sign_out')} />
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogTitle>{t('profile.sign_out_title')}</AlertDialogTitle>
				<AlertDialogDescription>{t('profile.sign_out_body')}</AlertDialogDescription>
				<Checkbox
					className="mt-4"
					checked={removeManageLinks}
					onCheckedChange={setRemoveManageLinks}
					label={t('profile.sign_out_remove_links')}
				/>
				<AlertDialogFooter>
					<AlertDialogAction variant="default" onPress={signOut}>
						{t('profile.sign_out_confirm')}
					</AlertDialogAction>
					<AlertDialogCancel>{t('profile.sign_out_cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// Profile tab (P2 A4 signed out; the rows lead to the settings stack). TASK-9.4 adds the account header and rows.
export default function ProfileTab() {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const { session, isAnonymous, loading } = useSession();
	if (loading) return <View className="flex-1 bg-background" />;
	const signedIn = Boolean(session) && !isAnonymous;

	const help = (
		<MenuRow
			icon={<Icon as={QuestionIcon} size={24} />}
			title={t('profile.row_help')}
			onPress={() => Linking.openURL(`${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en/safety' : '/varnost'}`)}
		/>
	);
	const cookies = (
		<MenuRow
			icon={<Icon as={CookieIcon} size={24} />}
			title={t('profile.row_cookie_settings')}
			onPress={() => router.push('/settings/consent')}
		/>
	);

	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<ScrollView contentContainerClassName="px-5 pb-8 pt-6">
				<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
					{t(signedIn ? 'profile.title' : 'profile.signed_out_title')}
				</Text>
				{signedIn ? (
					<View className="mt-7 gap-3">
						<LanguageRow />
						<MenuRow
							icon={<Icon as={BellRingingIcon} size={24} />}
							title={t('profile.row_alerts')}
							onPress={() => router.push('/settings/alerts')}
						/>
						<MenuRow
							icon={<Icon as={BellIcon} size={24} />}
							title={t('alerts.channels_title')}
							onPress={() => router.push('/settings/notifications')}
						/>
						<MenuRow
							icon={<Icon as={CreditCardIcon} size={24} />}
							title={t('profile.row_payments')}
							onPress={() => router.push('/settings/payments')}
						/>
						<MenuRow
							icon={<Icon as={UserCircleIcon} size={24} />}
							title={t('profile.nav_account')}
							onPress={() => router.push('/settings/account')}
						/>
						{cookies}
						{help}
						<SignOutRow />
					</View>
				) : (
					<>
						<Text className="mt-3 text-lg">{t('profile.signed_out_body')}</Text>
						<SignInButtons
							className="mt-7"
							signIn={t('profile.signed_out_sign_in')}
							create={t('profile.signed_out_create')}
						/>
						<View className="mt-10 gap-3">
							<LanguageRow />
							{cookies}
							{help}
						</View>
					</>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}
