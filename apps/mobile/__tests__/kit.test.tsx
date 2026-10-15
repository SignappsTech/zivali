import { fireEvent, render, screen } from '@testing-library/react-native';

import KitScreen from '@/app/dev/kit';

jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_ENV: 'local' } }));

test('the UI kit gallery shows the components with SL sample strings and switches to EN', async () => {
	await render(<KitScreen />);

	expect(screen.getByRole('heading', { name: 'P23 UI kit gallery' })).toBeOnTheScreen();
	expect(screen.getAllByRole('button', { name: 'Prijavi izgubljeno žival' }).length).toBeGreaterThan(0);
	expect(screen.getAllByLabelText('Številka čipa (neobvezno)').length).toBeGreaterThan(0);

	await fireEvent.press(screen.getByRole('radio', { name: 'EN' }));

	expect(screen.getAllByRole('button', { name: 'Report a lost pet' }).length).toBeGreaterThan(0);
	expect(screen.queryByText('Prijavi izgubljeno žival')).toBeNull();
}, 60_000);
