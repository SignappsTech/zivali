import { useRouter } from 'expo-router';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellRingingIcon } from 'phosphor-react-native/src/icons/BellRinging';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClipboardTextIcon } from 'phosphor-react-native/src/icons/ClipboardText';
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
import type { Me } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { OutboxList, usePendingPrompt } from '@/components/outbox/queue';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { resendConfirmation, signOutProviders } from '@/lib/auth';
import { env } from '@/lib/env';
import { signOutAndWipe } from '@/lib/offline/wipe';
import { unregisterPush } from '@/lib/push';

/**
 * "Odjava" and its confirmation; the wipe keeps the manage links unless the user ticks their removal, and unsent
 * reports first get "Send now / Delete / Cancel" (C17 §Wipe).
 */
function SignOutRow() {
	const t = useTranslations();
	const [removeManageLinks, setRemoveManageLinks] = React.useState(false);
	const { resolvePending, prompt } = usePendingPrompt();
	const signOut = async () => {
		try {
			if (await signOutAndWipe({ resolvePending, removeManageLinks, beforeSignOut: unregisterPush }))
				await signOutProviders();
		} catch {
			toast.error(t('errors.INTERNAL'));
		}
	};
	return (
		<>
			{prompt}
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
		</>
	);
}

/** P13 account header: avatar, name, email with its status word; "Pošlji povezavo" while the address is unconfirmed. */
function AccountHeader({ me }: { me: Me }) {
	const t = useTranslations('profile');
	const router = useRouter();
	const errorText = useErrorText();
	const [sending, setSending] = React.useState(false);
	const name = me.display_name || me.email || '';
	const sendLink = async () => {
		if (!me.email) return;
		setSending(true);
		try {
			await resendConfirmation(me.email);
			router.push({ pathname: '/auth/check-email', params: { email: me.email, sent: '1' } });
		} catch (failure) {
			toast.error(errorText(failure));
		} finally {
			setSending(false);
		}
	};
	return (
		<View className="mt-7 flex-row items-center gap-4">
			<Avatar size={72}>
				<AvatarFallback label={name}>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
			</Avatar>
			<View className="min-w-0 flex-1 items-start">
				{me.display_name ? <Text className="font-sans-bold text-xl">{me.display_name}</Text> : null}
				{me.email ? <Text className="text-muted-foreground">{me.email}</Text> : null}
				{me.email_verified ? (
					<View accessible className="mt-1 flex-row items-center gap-1.5">
						<Icon as={CheckIcon} size={16} />
						<Text className="font-sans-bold text-sm">{t('email_verified')}</Text>
					</View>
				) : (
					<>
						<Text className="mt-1 font-sans-bold text-sm text-muted-foreground">
							{t('email_unverified')}
						</Text>
						<Button variant="text" className="-ml-3" loading={sending} onPress={sendLink}>
							{t('email_send_link')}
						</Button>
					</>
				)}
			</View>
		</View>
	);
}

// Profile tab (P2 A4 signed out; P13 signed in: the account header, then rows into the settings stack).
export default function ProfileTab() {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const { session, me, isAnonymous, loading } = useSession();
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
				{signedIn && me ? <AccountHeader me={me} /> : null}
				{/* Reports sent or waiting on this device (FR-042); signed in, they lead "Moje prijave". */}
				{signedIn ? null : <OutboxList heading={t('report_found.my_reports')} className="mt-7" />}
				{signedIn ? (
					<View className="mt-7 gap-3">
						<LanguageRow />
						<MenuRow
							icon={<Icon as={ClipboardTextIcon} size={24} />}
							title={t('profile.row_reports')}
							onPress={() => router.push('/settings/reports')}
						/>
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
