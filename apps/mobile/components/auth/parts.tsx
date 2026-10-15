import { useNavigation, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import * as React from 'react';
import { KeyboardAvoidingView, Pressable, type Text as RNText, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslations } from 'use-intl';
import { useAccessibilityFocus } from '@rn-primitives/hooks';

import { ApiError } from '@zivali/api/client';
import type { QueryError } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Text } from '@/components/ui/text';
import { providers, signInWithProvider } from '@/lib/auth';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Leaves the whole auth stack, back to the screen that opened it (its draft untouched), or to the map. */
export function useLeaveAuth() {
	const navigation = useNavigation();
	const router = useRouter();
	return React.useCallback(() => {
		const parent = navigation.getParent();
		if (parent?.canGoBack()) parent.goBack();
		else router.replace('/');
	}, [navigation, router]);
}

/** ApiError code (or an RTK Query `QueryError` from `unwrap()`) → its errors.* sentence (C1); else the generic one. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (error: unknown) => {
		const code =
			error instanceof ApiError ? error.code : ((error as Partial<QueryError> | null)?.data?.code ?? 'INTERNAL');
		if (code === 'RATE_LIMITED') return t('RATE_LIMITED_generic');
		return t(code in en.errors ? (code as keyof typeof en.errors) : 'INTERNAL');
	};
}

function IconButton({ icon, label, onPress }: { icon: PhosphorIcon; label: string; onPress: () => void }) {
	return (
		<Pressable
			role="button"
			aria-label={label}
			onPress={onPress}
			className="size-11 items-center justify-center rounded-full active:bg-foreground/10"
		>
			<Icon as={icon} size={24} />
		</Pressable>
	);
}

type AuthScreenProps = {
	title: string;
	/** Back as well as close (forgot password). */
	back?: boolean;
	/** No close: the screen's only way on is its primary (verified). */
	closable?: boolean;
	/** Spot icon above the h1 for the single-message screens (check email, verified). */
	spot?: React.ReactNode;
	/** Actions at the bottom (single-message and single-question screens); otherwise they flow under the fields. */
	footer?: React.ReactNode;
	children?: React.ReactNode;
};

/**
 * P16 app frame: full screen with close (and back), the h1 34/40 that screen readers land on, 20 px sides. The content
 * scrolls and the keyboard pushes it up, so the primary is never hidden.
 */
export function AuthScreen({ title, back, closable = true, spot, footer, children }: AuthScreenProps) {
	const t = useTranslations('common');
	const router = useRouter();
	const leave = useLeaveAuth();
	const heading = useAccessibilityFocus<RNText>();
	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className={cn('h-14 flex-row items-center px-2', back ? 'justify-between' : 'justify-end')}>
				{back ? <IconButton icon={CaretLeftIcon} label={t('back')} onPress={() => router.back()} /> : null}
				{closable ? <IconButton icon={XIcon} label={t('close')} onPress={leave} /> : null}
			</View>
			<KeyboardAvoidingView behavior="padding" className="flex-1">
				<ScrollView
					keyboardShouldPersistTaps="handled"
					contentContainerClassName={cn('grow px-5 pt-2', footer ? 'pb-11' : 'pb-8')}
				>
					<View className={cn(spot && 'flex-1 justify-center', footer && !spot && 'flex-1')}>
						{spot ? <View className="mb-8">{spot}</View> : null}
						<Text
							ref={heading}
							role="heading"
							className="font-display text-[34px] leading-[40px] tracking-[-0.68px]"
						>
							{title}
						</Text>
						{children}
					</View>
					{footer ? <View className="gap-1 pt-6">{footer}</View> : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

type PasswordFieldProps = Omit<React.ComponentProps<typeof Input>, 'secureTextEntry'> & {
	label: string;
	hint?: string;
	error?: string;
	/** Single-question screens use the 64 px field. */
	large?: boolean;
};

/** Password line field with the eye button, renamed "Pokaži geslo" / "Skrij geslo" as it toggles. */
export function PasswordField({ label, hint, error, large, className, ...props }: PasswordFieldProps) {
	const t = useTranslations('auth');
	const [shown, setShown] = React.useState(false);
	return (
		<FormField label={label} hint={error ? undefined : hint} error={error} className={className}>
			<View className="justify-center">
				<Input
					secureTextEntry={!shown}
					autoCapitalize="none"
					autoCorrect={false}
					className={cn('pr-12', large && 'min-h-16')}
					{...props}
				/>
				<View className="absolute right-0">
					<IconButton
						icon={shown ? EyeSlashIcon : EyeIcon}
						label={t(shown ? 'password_hide' : 'password_show')}
						onPress={() => setShown(!shown)}
					/>
				</View>
			</View>
		</FormField>
	);
}

/** Calm note (system §10 Note): muted surface, radius 20, icon 22, text 15/22; announced politely. */
export function AuthNote({ icon, children, className }: { icon: PhosphorIcon; children: string; className?: string }) {
	return (
		<View
			role="status"
			aria-live="polite"
			className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}
		>
			<Icon as={icon} size={22} className="mt-0.5" />
			<Text className="min-w-0 flex-1 text-control leading-[22px]">{children}</Text>
		</View>
	);
}

/** Seconds left of a cooldown, shown in steps of 10 so the live text does not chatter (P16 M4). */
export function useCooldown() {
	const [left, setLeft] = React.useState(0);
	React.useEffect(() => {
		if (left <= 0) return;
		const timer = setTimeout(() => setLeft(left - 1), 1000);
		return () => clearTimeout(timer);
	}, [left]);
	return { active: left > 0, shown: Math.ceil(left / 10) * 10, start: (seconds = 60) => setLeft(seconds) };
}

/** "Pošlji znova" with the cooldown text under it; Supabase allows one confirmation email a minute. */
export function ResendButton({
	onResend,
	label,
	coolingDown,
}: {
	onResend: () => Promise<unknown>;
	label: string;
	coolingDown?: boolean;
}) {
	const t = useTranslations('auth');
	const errorText = useErrorText();
	const cooldown = useCooldown();
	const [sending, setSending] = React.useState(false);
	const { start } = cooldown;
	React.useEffect(() => {
		if (coolingDown) start();
		// Once, for the email that was just sent before this screen opened.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const resend = async () => {
		setSending(true);
		try {
			await onResend();
			start();
		} catch (error) {
			toast.error(errorText(error));
		} finally {
			setSending(false);
		}
	};
	return (
		<>
			<Button variant="text" disabled={cooldown.active} loading={sending} onPress={resend}>
				{label}
			</Button>
			{cooldown.active ? (
				<Text aria-live="polite" className="pb-1 text-center text-sm text-muted-foreground">
					{t('check_resend_wait', { seconds: cooldown.shown })}
				</Text>
			) : null}
		</>
	);
}

// Official marks (brand-literal, like the provider tokens): Google "G" in full colour in both modes, the Apple logo in
// the label colour.
function GoogleGlyph() {
	return (
		<Svg width={20} height={20} viewBox="0 0 48 48" aria-hidden>
			<Path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			/>
			<Path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			/>
			<Path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			/>
			<Path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			/>
		</Svg>
	);
}

function AppleGlyph() {
	const colors = useColors();
	return (
		<Svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
			<Path
				fill={colors['provider-foreground']}
				d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
			/>
		</Svg>
	);
}

/**
 * Google and Apple (system §10.2): 48 px, full width, 12 apart, Google first, the same on the page and in sheets. Only
 * the configured ones show; with none, nothing renders (including the "ali" above them).
 */
export function ProviderButtons({ onSignedIn, className }: { onSignedIn: () => void; className?: string }) {
	const t = useTranslations('auth');
	const errorText = useErrorText();
	const [busy, setBusy] = React.useState<'google' | 'apple' | null>(null);
	const available = (['google', 'apple'] as const).filter((provider) => providers[provider]);
	if (available.length === 0) return null;

	const press = async (provider: 'google' | 'apple') => {
		if (busy) return;
		setBusy(provider);
		try {
			if ((await signInWithProvider(provider)) === 'ok') onSignedIn();
			else toast(t('provider_cancelled'));
		} catch (error) {
			toast.error(errorText(error));
		} finally {
			setBusy(null);
		}
	};

	return (
		<View className={cn('gap-3', className)}>
			<Text className="text-center text-muted-foreground">{t('or')}</Text>
			{available.map((provider) => (
				<Button key={provider} variant="provider" loading={busy === provider} onPress={() => press(provider)}>
					{busy === provider ? null : provider === 'google' ? <GoogleGlyph /> : <AppleGlyph />}
					<Text>{t(provider)}</Text>
				</Button>
			))}
		</View>
	);
}
