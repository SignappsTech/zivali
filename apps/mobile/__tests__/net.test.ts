import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { getNetworkStateAsync, type NetworkState, NetworkStateType } from 'expo-network';
import { AppState } from 'react-native';

import { isUnmetered, setupNetworkListeners } from '@/lib/net';

import pkg from '../package.json';

let mockNetworkListener: (state: NetworkState) => void = () => {};
const mockRemove = jest.fn();
jest.mock('expo-network', () => ({
	NetworkStateType: { NONE: 'NONE', CELLULAR: 'CELLULAR', WIFI: 'WIFI', ETHERNET: 'ETHERNET' },
	addNetworkStateListener: jest.fn((listener) => {
		mockNetworkListener = listener;
		return { remove: mockRemove };
	}),
	getNetworkStateAsync: jest.fn(),
	useNetworkState: jest.fn(),
}));

test('network changes drive RTK Query online/offline (refetch on reconnect) until unsubscribed', () => {
	const types: string[] = [];
	const store = configureStore({
		reducer: (state: null = null, action: UnknownAction) => (types.push(action.type), state),
	});
	const appRemove = jest.fn();
	jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: appRemove });

	const unsubscribe = setupNetworkListeners(store.dispatch);
	mockNetworkListener({ isConnected: false, isInternetReachable: false });
	mockNetworkListener({ isConnected: true, isInternetReachable: true, type: NetworkStateType.CELLULAR });
	unsubscribe();

	expect(types.filter((type) => type.startsWith('__rtkq/'))).toEqual(['__rtkq/offline', '__rtkq/online']);
	expect(mockRemove).toHaveBeenCalled();
	expect(appRemove).toHaveBeenCalled();
});

test.each([
	[{ isConnected: true, isInternetReachable: true, type: NetworkStateType.WIFI }, true],
	[{ isConnected: true, isInternetReachable: true, type: NetworkStateType.ETHERNET }, true],
	[{ isConnected: true, isInternetReachable: true, type: NetworkStateType.CELLULAR }, false],
	[{ isConnected: true, isInternetReachable: false, type: NetworkStateType.WIFI }, false],
])('isUnmetered(%o) is %s', async (state, expected) => {
	jest.mocked(getNetworkStateAsync).mockResolvedValueOnce(state);
	expect(await isUnmetered()).toBe(expected);
});

test('no query-cache persister is installed', () => {
	expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain('redux-persist');
});
