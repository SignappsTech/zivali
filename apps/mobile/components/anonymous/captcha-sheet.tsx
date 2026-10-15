import * as React from 'react';
import { AccessibilityInfo, BackHandler, type Text as RNText, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { answerCaptcha, useCaptchaRequest } from '@/lib/anonymous';
import { env } from '@/lib/env';

/** Only the web app's own page may answer (C15 `/captcha`); Turnstile runs in its iframe from Cloudflare. */
const ORIGIN = env.EXPO_PUBLIC_APP_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');
/** Turnstile usually passes on its own; the sheet shows when the page asks for the person, or after this long. */
const REVEAL_AFTER_MS = 3000;

/**
 * Turnstile for the anonymous sign-in (C7, P7 "captcha runs invisibly; if it needs a challenge it appears as a
 * sheet"). Mounted once in the root layout; the page posts JSON `{ type: 'token', token }`, `{ type: 'interactive' }`
 * or `{ type: 'error' }`. The WebView stays mounted while it turns visible, so the widget keeps its state.
 */
export function CaptchaSheet() {
	const id = useCaptchaRequest();
	return id === null ? null : <Challenge key={id} />;
}

function Challenge() {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const locale = useLocale();
	const insets = useSafeAreaInsets();
	const [shown, setShown] = React.useState(false);
	const title = React.useRef<RNText>(null);

	React.useEffect(() => {
		const timer = setTimeout(() => setShown(true), REVEAL_AFTER_MS);
		return () => clearTimeout(timer);
	}, []);

	React.useEffect(() => {
		if (!shown) return;
		if (title.current) AccessibilityInfo.sendAccessibilityEvent(title.current, 'focus');
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			answerCaptcha.fail();
			return true;
		});
		return () => subscription.remove();
	}, [shown]);

	const onMessage = ({ nativeEvent }: WebViewMessageEvent) => {
		if (!nativeEvent.url.startsWith(`${ORIGIN}/`)) return;
		let message: { type?: unknown; token?: unknown };
		try {
			message = JSON.parse(nativeEvent.data);
		} catch {
			return;
		}
		if (message.type === 'token' && typeof message.token === 'string' && message.token) {
			answerCaptcha.token(message.token);
		} else if (message.type === 'interactive') setShown(true);
		else if (message.type === 'error') answerCaptcha.fail();
	};

	return (
		<View
			testID="captcha-sheet"
			// Hidden until needed: no touches, nothing for screen readers, but laid out so Turnstile can run.
			pointerEvents={shown ? 'auto' : 'none'}
			aria-hidden={!shown}
			importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
			className={shown ? 'absolute inset-0 justify-end bg-scrim' : 'absolute inset-0 justify-end opacity-0'}
		>
			<View
				aria-modal={shown}
				className="rounded-t-sheet bg-card px-5 pt-3"
				style={{ paddingBottom: Math.max(32, insets.bottom) }}
			>
				<SheetTitle ref={title}>{t('captcha_title')}</SheetTitle>
				<SheetDescription>{t('captcha_body')}</SheetDescription>
				<WebView
					source={{ uri: `${ORIGIN}/captcha?lang=${locale}` }}
					originWhitelist={[ORIGIN, 'https://challenges.cloudflare.com']}
					onMessage={onMessage}
					onError={answerCaptcha.fail}
					onHttpError={answerCaptcha.fail}
					// Not a NativeWind component, so a style; the widget is 65 px high.
					style={{ height: 72, marginTop: 16, backgroundColor: 'transparent' }}
				/>
				<Button variant="text" className="mt-2 self-start" onPress={answerCaptcha.fail}>
					{tc('cancel')}
				</Button>
			</View>
		</View>
	);
}
