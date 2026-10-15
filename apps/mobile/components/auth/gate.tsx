import { useRouter } from 'expo-router';
import { EnvelopeOpenIcon } from 'phosphor-react-native/src/icons/EnvelopeOpen';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { ProviderButtons, ResendButton } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { openMailApp, resendConfirmation } from '@/lib/auth';

export type AuthGateReason = 'report' | 'contact' | 'alerts' | 'tip' | 'pets';

type AuthGateProps = {
	/** Picks the title (P16 §5); report lost may pass its own title and body (P6). */
	reason: AuthGateReason;
	title?: string;
	body?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Runs once the user has a verified account: at once when they already had one, or after signing in. */
	onReady?: () => void;
};

/**
 * P16 contextual gate: a sheet over the step that needs an account. Signed out it offers sign-in, sign-up and the
 * providers; signed in but unconfirmed it is the "Potrdite svoj e-naslov" variant (not an error). The step stays
 * mounted under the auth screens, so what the user entered is kept and they come back to the same step.
 *
 * Usage: `<AuthGate reason="contact" open={open} onOpenChange={setOpen} onReady={send} />`, opened on the action.
 */
export function AuthGate({ reason, title, body, open, onOpenChange, onReady }: AuthGateProps) {
	const t = useTranslations('auth');
	const tc = useTranslations('common');
	const router = useRouter();
	const { gate, me } = useRequireAuth({ verified: true });
	// Set while the auth screens are open on top: the sheet is closed then, but the step still waits for the account.
	const waiting = React.useRef(false);

	React.useEffect(() => {
		if (gate !== 'ok' || !(open || waiting.current)) return;
		waiting.current = false;
		if (open) onOpenChange(false);
		onReady?.();
	}, [gate, open, onOpenChange, onReady]);

	const go = (pathname: '/auth/sign-in' | '/auth/sign-up') => {
		waiting.current = true;
		onOpenChange(false);
		router.push(pathname);
	};
	const cancel = () => {
		waiting.current = false;
		onOpenChange(false);
	};
	const unverified = gate === 'verify';
	const email = me?.email ?? '';

	return (
		<Sheet open={open && (gate === 'signin' || unverified)} onOpenChange={onOpenChange}>
			<SheetContent closeLabel={tc('close')}>
				<SheetTitle>
					{unverified ? t('gate_unverified_title') : (title ?? t(`gate_title_${reason}`))}
				</SheetTitle>
				<Text className="mt-3 text-lg">
					{unverified ? t('gate_unverified_body', { email }) : (body ?? t('gate_kept'))}
				</Text>
				{unverified ? (
					<View className="gap-1 pt-7">
						<Button size="lg" onPress={openMailApp}>
							<Icon as={EnvelopeOpenIcon} />
							{t('check_open_mail')}
						</Button>
						<ResendButton label={t('gate_unverified_resend')} onResend={() => resendConfirmation(email)} />
						<Button variant="text" onPress={cancel}>
							{t('gate_cancel')}
						</Button>
					</View>
				) : (
					<View className="gap-3 pt-7">
						<Button size="lg" onPress={() => go('/auth/sign-in')}>
							{t('gate_signin')}
						</Button>
						<Button variant="secondary" onPress={() => go('/auth/sign-up')}>
							{t('gate_signup')}
						</Button>
						{/* Signed in here, the effect above closes the sheet and continues. */}
						<ProviderButtons onSignedIn={() => undefined} />
						<Button variant="text" onPress={cancel}>
							{t('gate_cancel')}
						</Button>
					</View>
				)}
			</SheetContent>
		</Sheet>
	);
}
