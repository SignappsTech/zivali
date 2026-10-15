import type { Adapter } from '../index.ts';

export type MockEvent = { name: string; params: Record<string, unknown> };

const events: MockEvent[] = [];

/** What reached the adapter, i.e. only what was sent with consent. No network. */
export const getMockEvents = (): MockEvent[] => [...events];
export const resetMockEvents = (): void => {
	events.length = 0;
};

export const mockAdapter: Adapter = {
	enable() {},
	disable() {},
	event: (name, params) => events.push({ name, params }),
	screen: (path) => events.push({ name: 'screen_view', params: { path } }),
	userRole: (role) => events.push({ name: 'user_property', params: { user_role: role } }),
};
