import * as React from 'react';
import { Redirect } from 'expo-router';
import { useTranslations } from 'use-intl';

import { AuthScreen, PasswordField, useErrorText, useLeaveAuth } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { toast } from '@/components/ui/sonner';
import { MIN_PASSWORD, isRecovering, updatePassword } from '@/lib/auth';

/** P16 M8, opened by the reset link (app/auth/callback) with the recovery session; saving keeps the user signed in. */
export default function NewPassword() {
	if (!isRecovering()) return <Redirect href="/auth/forgot-password" />;
	return <NewPasswordForm />;
}

function NewPasswordForm() {
	const t = useTranslations('auth');
	const leave = useLeaveAuth();
	const errorText = useErrorText();
	const [password, setPassword] = React.useState('');
	const [short, setShort] = React.useState(false);
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		if (busy) return;
		setShort(password.length < MIN_PASSWORD);
		if (password.length < MIN_PASSWORD) return;
		setBusy(true);
		setError(undefined);
		try {
			await updatePassword(password);
			toast.success(t('newpass_done'));
			leave();
		} catch (failure) {
			setError(errorText(failure));
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthScreen
			title={t('newpass_title')}
			footer={
				<Button size="lg" loading={busy} onPress={submit}>
					{t('newpass_button')}
				</Button>
			}
		>
			<PasswordField
				label={t('newpass_label')}
				hint={t('password_hint')}
				error={short ? t('error_password_short') : undefined}
				large
				className="mt-8"
				value={password}
				onChangeText={(value) => {
					setPassword(value);
					setShort(false);
				}}
				autoComplete="new-password"
				textContentType="newPassword"
				returnKeyType="done"
				onSubmitEditing={submit}
			/>
			{error ? <FieldError className="mt-4">{error}</FieldError> : null}
		</AuthScreen>
	);
}
