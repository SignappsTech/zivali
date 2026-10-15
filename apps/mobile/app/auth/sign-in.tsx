import { useLocalSearchParams, useRouter } from 'expo-router';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import * as React from 'react';
import { type TextInput, View } from 'react-native';
import { useTranslations } from 'use-intl';

import { signInWithEmail } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import {
	AuthNote,
	AuthScreen,
	PasswordField,
	ProviderButtons,
	useCooldown,
	useErrorText,
	useLeaveAuth,
} from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

/** P16 M1: email and password; a wrong pair gets one message for the whole form, never per field (E1). */
export default function SignIn() {
	const t = useTranslations('auth');
	const router = useRouter();
	const leave = useLeaveAuth();
	const errorText = useErrorText();
	const params = useLocalSearchParams<{ email?: string }>();
	const [email, setEmail] = React.useState(params.email ?? '');
	const [password, setPassword] = React.useState('');
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);
	const limited = useCooldown();
	const passwordRef = React.useRef<TextInput>(null);

	const edit = (set: (value: string) => void) => (value: string) => {
		set(value);
		setError(undefined);
	};

	const submit = async () => {
		if (busy || limited.active) return;
		setBusy(true);
		setError(undefined);
		const address = email.trim();
		try {
			await signInWithEmail(address, password);
			leave();
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			if (code === 'UNVERIFIED_EMAIL') router.push({ pathname: '/auth/check-email', params: { email: address } });
			else if (code === 'RATE_LIMITED') limited.start();
			else
				setError(
					code === 'UNAUTHENTICATED' || code === 'VALIDATION' ? t('error_credentials') : errorText(failure)
				);
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthScreen title={t('signin_title')}>
			<View className="mt-8 gap-6">
				<FormField label={t('email_label')}>
					<Input
						value={email}
						onChangeText={edit(setEmail)}
						keyboardType="email-address"
						autoComplete="email"
						textContentType="emailAddress"
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="next"
						submitBehavior="submit"
						onSubmitEditing={() => passwordRef.current?.focus()}
					/>
				</FormField>
				<PasswordField
					ref={passwordRef}
					label={t('password_label')}
					value={password}
					onChangeText={edit(setPassword)}
					autoComplete="current-password"
					textContentType="password"
					returnKeyType="go"
					onSubmitEditing={submit}
				/>
			</View>
			{error ? <FieldError className="mt-4">{error}</FieldError> : null}
			<Button
				variant="text"
				className="-ml-3 mt-1 self-start"
				onPress={() => router.push({ pathname: '/auth/forgot-password', params: { email: email.trim() } })}
			>
				{t('forgot_link')}
			</Button>
			{limited.active ? (
				<AuthNote icon={ClockIcon} className="mt-4">
					{t('error_rate_limited')}
				</AuthNote>
			) : null}
			<Button size="lg" className="mt-6" loading={busy} disabled={limited.active} onPress={submit}>
				{t('signin_button')}
			</Button>
			<ProviderButtons className="mt-6" onSignedIn={leave} />
			<Button
				variant="text"
				className="mt-4"
				onPress={() => router.replace({ pathname: '/auth/sign-up', params: { email: email.trim() } })}
			>
				{t('to_signup')}
			</Button>
		</AuthScreen>
	);
}
