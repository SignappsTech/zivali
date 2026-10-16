import { useLocalSearchParams, useRouter } from 'expo-router';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { ShieldWarningIcon } from 'phosphor-react-native/src/icons/ShieldWarning';
import * as React from 'react';
import { Linking, type TextInput, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { track } from '@zivali/analytics';
import { useSession } from '@zivali/api/auth';
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
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { convertAnonymous, MIN_PASSWORD, signUp, validEmail } from '@/lib/auth';
import { env } from '@/lib/env';

/** Inline link in a sentence (terms, privacy): opens the web page. */
function WebLink({ url, children }: { url: string; children: React.ReactNode }) {
	return (
		<Text
			role="link"
			className="font-sans-bold text-sm text-primary underline"
			onPress={() => Linking.openURL(url)}
		>
			{children}
		</Text>
	);
}

type Field = 'name' | 'email' | 'password';

/**
 * P16 M2: name, email and password; checked on submit, then live per field (E2); terms as a sentence with links.
 *
 * `convert=1` (the anonymous finder's account offer) while this session is anonymous: the same form turns the session
 * into the account (convertAnonymous, C7 §6), so the reports made without one stay. GoTrue names a taken address
 * here, so the form says it and how to add the report to that account (sign in, then the private link); no providers
 * (they would start another user).
 */
export default function SignUp() {
	const t = useTranslations('auth');
	const te = useTranslations('errors');
	const locale = useLocale();
	const router = useRouter();
	const leave = useLeaveAuth();
	const errorText = useErrorText();
	const params = useLocalSearchParams<{ email?: string; convert?: string }>();
	const { isAnonymous } = useSession();
	const convert = params.convert === '1' && isAnonymous;
	const [values, setValues] = React.useState({ name: '', email: params.email ?? '', password: '' });
	const [submitted, setSubmitted] = React.useState(false);
	const [serverError, setServerError] = React.useState<{
		field?: Field;
		text: string;
		note?: 'limited' | 'captcha';
	}>();
	const [busy, setBusy] = React.useState(false);
	const limited = useCooldown();
	const nameRef = React.useRef<TextInput>(null);
	const emailRef = React.useRef<TextInput>(null);
	const passwordRef = React.useRef<TextInput>(null);

	const errors: Partial<Record<Field, string>> = submitted
		? {
				name: values.name.trim() ? undefined : t('error_name_required'),
				email: validEmail(values.email.trim()) ? undefined : t('error_email_invalid'),
				password: values.password.length >= MIN_PASSWORD ? undefined : t('error_password_short'),
			}
		: {};
	if (serverError?.field && !errors[serverError.field]) errors[serverError.field] = serverError.text;

	const set = (field: Field) => (value: string) => {
		setValues((current) => ({ ...current, [field]: value }));
		if (serverError?.field === field || !serverError?.field) setServerError(undefined);
	};

	const submit = async () => {
		if (busy || limited.active) return;
		setSubmitted(true);
		setServerError(undefined);
		const email = values.email.trim();
		const invalid = (['name', 'email', 'password'] as const).find((field) =>
			field === 'name'
				? !values.name.trim()
				: field === 'email'
					? !validEmail(email)
					: values.password.length < MIN_PASSWORD
		);
		if (invalid) {
			({ name: nameRef, email: emailRef, password: passwordRef })[invalid].current?.focus();
			return;
		}
		const account = { name: values.name.trim(), email, password: values.password, locale };
		const checkEmail = {
			pathname: '/auth/check-email' as const,
			params: { email, sent: '1', ...(convert && { convert: '1' }) },
		};
		setBusy(true);
		try {
			if (convert) {
				await convertAnonymous(account);
				// C12, dropped without consent; never the address.
				track('sign_up', { method: 'convert' });
			} else await signUp(account);
			router.push(checkEmail);
		} catch (failure) {
			const code = failure instanceof ApiError ? failure.code : null;
			if (code === 'CONFLICT' && convert) {
				setServerError({ field: 'email', text: t('convert_email_taken') });
				emailRef.current?.focus();
			}
			// Taken address: same as success, so the form does not reveal which addresses have an account.
			else if (code === 'CONFLICT') router.push(checkEmail);
			else if (code === 'VALIDATION') {
				const authCode = failure instanceof ApiError ? failure.details?.auth_code : undefined;
				// The API's convert-password refuses the password itself (its policy or GoTrue's) with an issue on it.
				const passwordRefused =
					failure instanceof ApiError && failure.issues?.some((i) => i.path === 'password');
				if (authCode === 'email_address_invalid')
					setServerError({ field: 'email', text: t('error_email_invalid') });
				else if (convert && passwordRefused) {
					setServerError({ field: 'password', text: t('error_password_weak') });
					passwordRef.current?.focus();
				} else setServerError({ text: te('VALIDATION') });
			} else if (code === 'RATE_LIMITED') {
				limited.start();
				setServerError({ text: t('error_rate_limited'), note: 'limited' });
			} else if (code === 'CAPTCHA_FAILED') setServerError({ text: te('CAPTCHA_FAILED'), note: 'captcha' });
			else setServerError({ text: errorText(failure) });
		} finally {
			setBusy(false);
		}
	};

	const web = (sl: string, en: string) => `${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? en : sl}`;
	const note =
		serverError?.note === 'captcha' || (serverError?.note === 'limited' && limited.active)
			? serverError
			: undefined;

	return (
		<AuthScreen title={t('signup_title')}>
			{convert ? (
				<View className="mt-3 flex-row gap-2">
					<Icon as={ShieldCheckIcon} weight="fill" size={20} className="mt-1 text-primary" />
					<Text className="min-w-0 flex-1 text-lg">{t('convert_note')}</Text>
				</View>
			) : null}
			<View className="mt-8 gap-6">
				<FormField label={t('name_label')} hint={errors.name ? undefined : t('name_help')} error={errors.name}>
					<Input
						ref={nameRef}
						value={values.name}
						onChangeText={set('name')}
						maxLength={60}
						autoComplete="given-name"
						textContentType="givenName"
						autoCapitalize="words"
						returnKeyType="next"
						submitBehavior="submit"
						onSubmitEditing={() => emailRef.current?.focus()}
					/>
				</FormField>
				<FormField label={t('email_label')} error={errors.email}>
					<Input
						ref={emailRef}
						value={values.email}
						onChangeText={set('email')}
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
					hint={t('password_hint')}
					error={errors.password}
					value={values.password}
					onChangeText={set('password')}
					autoComplete="new-password"
					textContentType="newPassword"
					returnKeyType="go"
					onSubmitEditing={submit}
				/>
			</View>
			<Text className="mt-6 text-sm text-muted-foreground">
				{t.rich('terms_sentence', {
					terms: (chunks) => <WebLink url={web('/pogoji-uporabe', '/en/terms')}>{chunks}</WebLink>,
					privacy: (chunks) => <WebLink url={web('/zasebnost', '/en/privacy')}>{chunks}</WebLink>,
				})}
			</Text>
			{note ? (
				<AuthNote icon={note.note === 'captcha' ? ShieldWarningIcon : ClockIcon} className="mt-4">
					{note.text}
				</AuthNote>
			) : serverError && !serverError.field && !serverError.note ? (
				<FieldError className="mt-4">{serverError.text}</FieldError>
			) : null}
			<Button size="lg" className="mt-6" loading={busy} disabled={limited.active} onPress={submit}>
				{t('signup_button')}
			</Button>
			{convert ? null : <ProviderButtons className="mt-6" onSignedIn={leave} />}
			<Button
				variant="text"
				className="mt-4"
				onPress={() => router.replace({ pathname: '/auth/sign-in', params: { email: values.email.trim() } })}
			>
				{t('to_signin')}
			</Button>
		</AuthScreen>
	);
}
