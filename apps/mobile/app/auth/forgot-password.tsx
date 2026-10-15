import { useLocalSearchParams } from 'expo-router';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import * as React from 'react';
import { useTranslations } from 'use-intl';

import { requestPasswordReset } from '@zivali/api/auth';
import { ApiError } from '@zivali/api/client';
import { AuthNote, AuthScreen, useErrorText } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { authRedirect, validEmail } from '@/lib/auth';

/** P16 M6, M7: one question; the answer never says whether the address has an account. */
export default function ForgotPassword() {
	const t = useTranslations('auth');
	const errorText = useErrorText();
	const params = useLocalSearchParams<{ email?: string }>();
	const [email, setEmail] = React.useState(params.email ?? '');
	const [invalid, setInvalid] = React.useState(false);
	const [result, setResult] = React.useState<'sent' | 'limited' | { error: string }>();
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		if (busy) return;
		const address = email.trim();
		setInvalid(!validEmail(address));
		if (!validEmail(address)) return;
		setBusy(true);
		try {
			await requestPasswordReset(address, { redirectTo: authRedirect('recovery') });
			setResult('sent');
		} catch (failure) {
			setResult(
				failure instanceof ApiError && failure.code === 'RATE_LIMITED'
					? 'limited'
					: { error: errorText(failure) }
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthScreen
			title={t('forgot_title')}
			back
			footer={
				<Button size="lg" loading={busy} onPress={submit}>
					{t('forgot_button')}
				</Button>
			}
		>
			<Text className="mt-3 text-lg">{t('forgot_body')}</Text>
			<FormField label={t('email_label')} error={invalid ? t('error_email_invalid') : undefined} className="mt-8">
				<Input
					value={email}
					onChangeText={(value) => {
						setEmail(value);
						setInvalid(false);
					}}
					className="min-h-16"
					keyboardType="email-address"
					autoComplete="email"
					textContentType="emailAddress"
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="send"
					onSubmitEditing={submit}
				/>
			</FormField>
			{result === 'sent' ? (
				<AuthNote icon={EnvelopeSimpleIcon} className="mt-8">
					{t('forgot_done')}
				</AuthNote>
			) : result === 'limited' ? (
				<AuthNote icon={ClockIcon} className="mt-8">
					{t('error_rate_limited')}
				</AuthNote>
			) : result ? (
				<FieldError className="mt-4">{result.error}</FieldError>
			) : null}
		</AuthScreen>
	);
}
