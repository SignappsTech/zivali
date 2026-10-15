// Native modules behind the UI kit (components/ui) have no implementation under Jest; their packages ship these mocks.
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// The Reanimated mock leaves out useReducedMotion ("add me if needed"); tests run with motion on.
jest.mock('react-native-reanimated', () => ({
	...jest.requireActual('react-native-reanimated/mock'),
	useReducedMotion: () => false,
}));
jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('@gorhom/bottom-sheet/mock'));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default
);
