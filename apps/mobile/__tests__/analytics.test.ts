import { getMockEvents, resetMockEvents, setConsent, track, trackScreen } from '@zivali/analytics';
import { consentStorage, routeTemplate, setupAnalytics } from '@/lib/analytics';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
	getItem: (k: string) => mockStore.get(k) ?? null,
	setItem: (k: string, v: string) => void mockStore.set(k, v),
}));

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_ANALYTICS_PROVIDER: 'mock' } }));

beforeEach(() => {
	mockStore.clear();
	resetMockEvents();
	setupAnalytics();
});

describe('mobile analytics wiring', () => {
	it('uses route templates without groups or ids', () => {
		expect(routeTemplate([])).toBe('/');
		expect(routeTemplate(['(tabs)', 'profile'])).toBe('/profile');
		expect(routeTemplate(['r', '[code]'])).toBe('/r/[code]');
	});

	it('stays off until consent, on grant sends screen_view, on withdraw stops', () => {
		trackScreen('/profile');
		track('report_found_start');
		expect(getMockEvents()).toHaveLength(0);

		setConsent({ analytics: true });
		expect(consentStorage.get()).toContain('"analytics":true');
		track('report_found_start');
		expect(getMockEvents().map((e) => e.name)).toContain('report_found_start');

		resetMockEvents();
		setConsent({ analytics: false });
		track('report_found_start');
		expect(getMockEvents()).toHaveLength(0);
	});
});
