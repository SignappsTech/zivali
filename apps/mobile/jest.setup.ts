// Native modules behind the UI kit (components/ui) have no implementation under Jest; their packages ship these mocks.
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// The Reanimated mock leaves out useReducedMotion ("add me if needed"); tests run with motion on.
jest.mock('react-native-reanimated', () => ({
	...jest.requireActual('react-native-reanimated/mock'),
	useReducedMotion: () => false,
}));
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
// MapLibre Native ships no mock: its components become host Views that keep their props (testID `<Component>:<id>`),
// and the Camera and GeoJSONSource refs are the shared spies in `__refs`.
jest.mock('@maplibre/maplibre-react-native', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	const { View } = jest.requireActual<typeof import('react-native')>('react-native');
	const __refs = {
		camera: { easeTo: jest.fn() },
		source: { getClusterExpansionZoom: jest.fn(async () => 14) },
	};
	const host = (name: string, handle: object = {}) =>
		Object.assign(
			({ ref, ...props }: { ref?: React.Ref<object>; id?: string; testID?: string }) => {
				React.useImperativeHandle(ref, () => handle);
				return React.createElement(View, { ...props, testID: props.testID ?? `${name}:${props.id}` });
			},
			{ displayName: name }
		);
	return {
		__refs,
		Map: host('Map'),
		Camera: host('Camera', __refs.camera),
		GeoJSONSource: host('GeoJSONSource', __refs.source),
		Layer: host('Layer'),
	};
});
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default
);
