import * as React from 'react';
import { Redirect } from 'expo-router';
import { useTranslations } from 'use-intl';

import { AuthScreen, PasswordField, useErrorText, useLeaveAuth } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { MIN_PASSWORD, isRecovering, passwordTooLong, updatePassword } from '@/lib/auth';

/**
 * P16 M8, opened by the reset link (app/auth/callback) with the recovery session; saving keeps the user signed in.
 * `set` (C7 §6): the first password of a converted finder, whose address the link has just confirmed.
 */
export default function NewPassword() {
	const mode = isRecovering();
	if (!mode) return <Redirect href="/auth/forgot-password" />;
	return <NewPasswordForm set={mode === 'set'} />;
}

function NewPasswordForm({ set }: { set: boolean }) {
	const t = useTranslations('auth');
	const leave = useLeaveAuth();
	const errorText = useErrorText();
	const [password, setPassword] = React.useState('');
	const [problem, setProblem] = React.useState<'error_password_short' | 'error_password_long'>();
	const [error, setError] = React.useState<string>();
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		if (busy) return;
		const issue =
			password.length < MIN_PASSWORD
				? 'error_password_short'
				: passwordTooLong(password)
					? 'error_password_long'
					: undefined;
		setProblem(issue);
		if (issue) return;
		setBusy(true);
		setError(undefined);
		try {
			await updatePassword(password);
			toast.success(t(set ? 'setpass_done' : 'newpass_done'));
			leave();
		} catch (failure) {
			setError(errorText(failure));
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthScreen
			title={t(set ? 'setpass_title' : 'newpass_title')}
			footer={
				<Button size="lg" loading={busy} onPress={submit}>
					{t('newpass_button')}
				</Button>
			}
		>
			{set ? <Text className="mt-3 text-lg">{t('setpass_body')}</Text> : null}
			<PasswordField
				label={t('newpass_label')}
				hint={t('password_hint')}
				error={problem && t(problem)}
				large
				className="mt-8"
				value={password}
				onChangeText={(value) => {
					setPassword(value);
					setProblem(undefined);
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
