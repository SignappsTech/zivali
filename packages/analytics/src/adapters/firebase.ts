import type { Adapter } from '../index.ts';

/** The part of a `@react-native-firebase/analytics` instance this adapter uses; the mobile app injects it. */
export type FirebaseAnalytics = {
	logEvent(name: string, params?: Record<string, unknown>): Promise<void>;
	logScreenView(params: { screen_name: string; screen_class: string }): Promise<void>;
	setUserProperty(name: string, value: string | null): Promise<void>;
	setConsent(consent: {
		analytics_storage: boolean;
		ad_storage: boolean;
		ad_user_data: boolean;
		ad_personalization: boolean;
	}): Promise<void>;
	setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
	resetAnalyticsData(): Promise<void>;
};

// Analytics must never break the app.
const quiet = (promise: Promise<unknown>) => void promise.catch(() => {});

/** C12 §Mobile wiring: firebase.json starts with collection off and every consent signal denied. */
export function createFirebaseAdapter(fb: FirebaseAnalytics): Adapter {
	const consent = (granted: boolean) =>
		quiet(
			fb.setConsent({
				analytics_storage: granted,
				ad_storage: false,
				ad_user_data: false,
				ad_personalization: false,
			})
		);

	return {
		enable() {
			consent(true);
			quiet(fb.setAnalyticsCollectionEnabled(true));
		},
		disable() {
			consent(false);
			quiet(fb.setAnalyticsCollectionEnabled(false));
			quiet(fb.resetAnalyticsData());
		},
		event: (name, params) => quiet(fb.logEvent(name, params)),
		screen: (path) => quiet(fb.logScreenView({ screen_name: path, screen_class: path })),
		userRole: (role) => quiet(fb.setUserProperty('user_role', role)),
	};
}
