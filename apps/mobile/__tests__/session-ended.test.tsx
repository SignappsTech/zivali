import { act, render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { SessionEndedNotice } from '@/components/shell/session-ended';
import { I18nProvider } from '@/lib/i18n';
import { pendingCount } from '@/lib/offline/outbox';
import { takeSessionEnded } from '@/lib/offline/wipe';

// An unexpected sign-out leaves a flag (lib/offline/wipe); the next open or foreground says so once.
jest.mock('expo-sqlite/localStorage/install', () => {
	const mockStore = new Map<string, string>();
	globalThis.localStorage = {
		getItem: (name: string) => mockStore.get(name) ?? null,
		setItem: (name: string, value: string) => void mockStore.set(name, value),
		removeItem: (name: string) => void mockStore.delete(name),
	} as Storage;
	return {};
});
const mockToast = jest.fn();
jest.mock('@/components/ui/sonner', () => ({ toast: (message: string) => mockToast(message) }));
jest.mock('@/lib/offline/wipe', () => ({ takeSessionEnded: jest.fn() }));
jest.mock('@/lib/offline/outbox', () => ({ pendingCount: jest.fn() }));
const mockResolvePending = jest.fn(async () => true);
jest.mock('@/components/outbox/queue', () => ({
	usePendingPrompt: () => ({ resolvePending: mockResolvePending, prompt: null }),
}));

const mount = () =>
	render(
		<I18nProvider>
			<SessionEndedNotice />
		</I18nProvider>
	);

beforeEach(() => jest.clearAllMocks());

test('shows the notice once when the flag is set, then the pending prompt if reports are unsent', async () => {
	jest.mocked(takeSessionEnded).mockReturnValueOnce(true);
	jest.mocked(pendingCount).mockResolvedValue(2);
	mount();
	await waitFor(() => expect(mockResolvePending).toHaveBeenCalledWith(2));
	expect(mockToast).toHaveBeenCalledTimes(1);
	expect(mockToast).toHaveBeenCalledWith(expect.stringMatching(/Odjavljeni ste bili|signed out/));
});

test('shows nothing without the flag, and no prompt without unsent reports', async () => {
	jest.mocked(takeSessionEnded).mockReturnValueOnce(false).mockReturnValueOnce(true);
	jest.mocked(pendingCount).mockResolvedValue(0);
	let onChange: (state: string) => void = () => {};
	jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, listener: (state: string) => void) => {
		onChange = listener;
		return { remove: jest.fn() };
	}) as never);
	mount();
	await waitFor(() => expect(takeSessionEnded).toHaveBeenCalledTimes(1));
	expect(mockToast).not.toHaveBeenCalled();
	await act(async () => onChange('active'));
	await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
	expect(mockResolvePending).not.toHaveBeenCalled();
});
