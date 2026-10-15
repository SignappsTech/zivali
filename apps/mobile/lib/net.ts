import { type ThunkDispatch, type UnknownAction } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
	addNetworkStateListener,
	getNetworkStateAsync,
	type NetworkState,
	NetworkStateType,
	useNetworkState,
} from 'expo-network';
import { AppState } from 'react-native';

// Network state for the offline layer (C17). No query-cache persister: private queries stay in memory.
export { useNetworkState };

/** Online unless the OS says there is no connection or no internet behind it. */
export const isOnline = (state: NetworkState): boolean =>
	state.isConnected !== false && state.isInternetReachable !== false;

/** Wi-Fi or Ethernet: background sync and offline thumbnails run only here unless the user allows mobile data. */
export async function isUnmetered(): Promise<boolean> {
	const state = await getNetworkStateAsync();
	return isOnline(state) && (state.type === NetworkStateType.WIFI || state.type === NetworkStateType.ETHERNET);
}

/**
 * RTK Query's `refetchOnReconnect` / `refetchOnFocus` for React Native (there are no window events): call once with
 * the store's dispatch; returns the unsubscribe.
 */
export function setupNetworkListeners(dispatch: ThunkDispatch<unknown, unknown, UnknownAction>): () => void {
	return setupListeners(dispatch, (dispatch, { onOnline, onOffline, onFocus, onFocusLost }) => {
		const network = addNetworkStateListener((state) => dispatch(isOnline(state) ? onOnline() : onOffline()));
		const app = AppState.addEventListener('change', (state) =>
			dispatch(state === 'active' ? onFocus() : onFocusLost())
		);
		return () => {
			network.remove();
			app.remove();
		};
	});
}
