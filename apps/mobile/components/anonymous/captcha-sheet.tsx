import * as React from 'react';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale, useTranslations } from 'use-intl';

import { Button } from '@/components/ui/button';
import { answerCaptcha, useCaptchaRequest } from '@/lib/anonymous';
import { env } from '@/lib/env';

/** Only the web app's own page may answer (C15 `/captcha`); Turnstile runs in its iframe from Cloudflare. */
const ORIGIN = env.EXPO_PUBLIC_APP_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');
/** Turnstile usually passes on its own within a moment; if not, it needs the person and the sheet shows. */
const REVEAL_AFTER_MS = 3000;
/** Hard stop: a sheet that is lost or never answers must not leave ensureSession hanging. */
const TIMEOUT_MS = 60_000;

/** The page, Turnstile's own frames and about:blank only; any other navigation is refused. */
export const allowNavigation = (url: string) =>
	url.startsWith(`${ORIGIN}/captcha`) || url.startsWith('https://challenges.cloudflare.com') || url === 'about:blank';

/**
 * Turnstile for the anonymous sign-in (C7; P7 "captcha runs invisibly; if it needs a challenge it appears as a
 * sheet"). Mounted once in the root layout. The web page `/captcha?lang=` shows the title, the sentence and the
 * widget, and posts JSON: `{ type: 'captcha', token }` (`token: null` while the web captcha is off) or
 * `{ type: 'captcha_error' }`. The WebView stays mounted when the sheet shows, so the widget keeps its state.
 */
export function CaptchaSheet() {
	const id = useCaptchaRequest();
	return id === null ? null : <Challenge key={id} id={id} />;
}

function Challenge({ id }: { id: number }) {
	const t = useTranslations();
	const locale = useLocale();
	const insets = useSafeAreaInsets();
	const [shown, setShown] = React.useState(false);
	const cancel = React.useRef<View>(null);
	const fail = React.useCallback(() => answerCaptcha.fail(id), [id]);

	React.useEffect(() => {
		const reveal = setTimeout(() => setShown(true), REVEAL_AFTER_MS);
		const timeout = setTimeout(fail, TIMEOUT_MS);
		return () => {
			clearTimeout(reveal);
			clearTimeout(timeout);
		};
	}, [fail]);

	React.useEffect(() => {
		if (!shown) return;
		// As in an alert dialog, the safe action takes screen reader focus (system §10.9).
		if (cancel.current) AccessibilityInfo.sendAccessibilityEvent(cancel.current, 'focus');
		const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
			fail();
			return true;
		});
		return () => subscription.remove();
	}, [shown, fail]);

	const onMessage = ({ nativeEvent }: WebViewMessageEvent) => {
		if (!nativeEvent.url.startsWith(`${ORIGIN}/`)) return;
		let message: { type?: unknown; token?: unknown };
		try {
			message = JSON.parse(nativeEvent.data);
		} catch {
			return;
		}
		if (message.type === 'captcha' && (typeof message.token === 'string' || message.token === null)) {
			answerCaptcha.token(id, message.token ?? undefined);
		} else if (message.type === 'captcha_error') fail();
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
				aria-label={t('report_found.captcha_title')}
				className="rounded-t-sheet bg-card px-5 pt-3"
				style={{ paddingBottom: Math.max(32, insets.bottom) }}
			>
				<WebView
					source={{ uri: `${ORIGIN}/captcha?lang=${locale}` }}
					originWhitelist={[ORIGIN, 'https://challenges.cloudflare.com']}
					onMessage={onMessage}
					onShouldStartLoadWithRequest={(request) => allowNavigation(request.url)}
					setSupportMultipleWindows={false}
					allowFileAccess={false}
					javaScriptCanOpenWindowsAutomatically={false}
					onError={fail}
					onHttpError={fail}
					// Not a NativeWind component, so a style: room for the page's heading, sentence and the 65 px widget.
					style={{ height: 280, backgroundColor: 'transparent' }}
				/>
				<Button ref={cancel} variant="text" className="mt-2 self-start" onPress={fail}>
					{t('common.cancel')}
				</Button>
			</View>
		</View>
	);
}
