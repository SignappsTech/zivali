import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useAccessibilityFocus } from '@rn-primitives/hooks';
import * as React from 'react';
import { Linking, type Text as RNText, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { CONSENT_VERSION, getConsent, needsConsentPrompt, setConsent, subscribeConsent } from '@zivali/analytics';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';

/** The stored choice and whether the prompt is due (never asked, version bump or older than 12 months). */
export function useConsent() {
	const state = React.useSyncExternalStore(subscribeConsent, getConsent, getConsent);
	return { state, due: needsConsentPrompt() };
}

/** Three equal buttons (P17): same size, same `secondary` style, never `primary`; stacked, full width. */
function Choices({ children }: { children: React.ReactNode }) {
	return <View className="gap-3 pt-2">{children}</View>;
}

/** First sentence of a re-ask: what changed (a `consent.change_<version>` phrase) or "a year has passed". */
function useReask(): string | null {
	const t = useTranslations('consent');
	const { state } = useConsent();
	if (!state) return null;
	if (state.v !== CONSENT_VERSION) {
		const key = `change_${CONSENT_VERSION}`;
		return (t.has as (k: string) => boolean)(key)
			? t('reask_changed', { change: (t as unknown as (k: string) => string)(key) })
			: null;
	}
	return t('reask_year');
}

function PolicyLink() {
	const t = useTranslations('consent');
	const locale = useLocale();
	return (
		<Button
			variant="text"
			className="self-start"
			onPress={() =>
				Linking.openURL(`${env.EXPO_PUBLIC_APP_URL}${locale === 'en' ? '/en/cookies' : '/piskotki'}`)
			}
		>
			{t('policy_link')}
		</Button>
	);
}

function Heading({ children }: { children: string }) {
	const ref = useAccessibilityFocus<RNText>();
	return (
		<Text ref={ref} role="heading" className="pt-3 font-display text-2xl tracking-[-0.36px] text-foreground">
			{children}
		</Text>
	);
}

/**
 * P17 Customise view: Essential (on, locked) and Analytics (off unless `initial`), then Save choice, Accept all and
 * Reject all at equal weight. Used inside the first-launch sheet and as the Settings screen.
 */
export function ConsentCustomise({
	initial,
	onChoose,
	onBack,
	heading,
}: {
	initial: boolean;
	onChoose: (analytics: boolean) => void;
	onBack?: () => void;
	heading?: boolean;
}) {
	const t = useTranslations('consent');
	const [analytics, setAnalytics] = React.useState(initial);
	return (
		<View>
			{onBack ? (
				<Button variant="text" className="-ml-3 self-start" onPress={onBack}>
					{t('back')}
				</Button>
			) : null}
			{heading ? <Heading>{t('settings_title')}</Heading> : null}
			<View className="mt-4 gap-5">
				<View>
					<Switch checked disabled label={t('necessary_title')} aria-label={t('necessary_title')} />
					<Text className="text-sm text-muted-foreground">{t('necessary_locked')}</Text>
					<Text className="mt-1 text-muted-foreground">
						{t.raw('necessary_body').replace(/<\/?link>/g, '')}
					</Text>
				</View>
				<View>
					<Switch
						checked={analytics}
						onCheckedChange={setAnalytics}
						label={t('analytics_title')}
						aria-label={t('analytics_switch_a11y')}
					/>
					<Text className="mt-1 text-muted-foreground">{t('analytics_body_app')}</Text>
				</View>
			</View>
			<PolicyLink />
			<Choices>
				<Button size="lg" variant="secondary" onPress={() => onChoose(analytics)}>
					{t('save')}
				</Button>
				<Button size="lg" variant="secondary" onPress={() => onChoose(true)}>
					{t('accept_all')}
				</Button>
				<Button size="lg" variant="secondary" onPress={() => onChoose(false)}>
					{t('reject_all')}
				</Button>
			</Choices>
		</View>
	);
}

// SheetContent's grabber (44 px, -12 overlap) and bottom padding.
const SHEET_CHROME = 32;

/**
 * First-launch consent sheet (P17), mounted once in the root layout after the first render. Reject all, Accept all and
 * Customise look and weigh the same; nothing is pre-selected. Dismissing it (grabber, scrim, back) stores nothing, so
 * everything stays denied and it returns on the next launch. Closes when a choice is stored.
 */
export function ConsentSheet() {
	const t = useTranslations('consent');
	const tc = useTranslations('common');
	const { due } = useConsent();
	const reask = useReask();
	const [dismissed, setDismissed] = React.useState(false);
	const [custom, setCustom] = React.useState(false);
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const open = due && !dismissed;

	return (
		<Sheet open={open} onOpenChange={(next) => !next && setDismissed(true)}>
			<SheetContent closeLabel={tc('close')}>
				<View
					accessibilityLabel={t('dialog_label')}
					style={{ maxHeight: height * 0.92 - SHEET_CHROME - Math.max(32, insets.bottom) }}
				>
					<BottomSheetScrollView style={{ flexGrow: 0, flexShrink: 1 }}>
						{custom ? (
							<ConsentCustomise
								initial={false}
								heading
								onBack={() => setCustom(false)}
								onChoose={(analytics) => setConsent({ analytics })}
							/>
						) : (
							<View>
								<Heading>{t('title')}</Heading>
								{reask ? <Text className="mt-2 font-sans-bold">{reask}</Text> : null}
								<Text className="mt-2 text-muted-foreground">{t('body_app')}</Text>
								<PolicyLink />
								<Choices>
									<Button
										size="lg"
										variant="secondary"
										onPress={() => setConsent({ analytics: false })}
									>
										{t('reject_all')}
									</Button>
									<Button
										size="lg"
										variant="secondary"
										onPress={() => setConsent({ analytics: true })}
									>
										{t('accept_all')}
									</Button>
									<Button size="lg" variant="secondary" onPress={() => setCustom(true)}>
										{t('customise')}
									</Button>
								</Choices>
							</View>
						)}
					</BottomSheetScrollView>
				</View>
			</SheetContent>
		</Sheet>
	);
}
