import { fireEvent, render, screen } from '@testing-library/react-native';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

// The spinner is hidden from assistive tech (the button says it is busy), so it is found by its test id.
const spinner = () => screen.queryByTestId('spinner', { includeHiddenElements: true });

describe('Button', () => {
	test('is a plain button by default', async () => {
		const onPress = jest.fn();
		await render(<Button onPress={onPress}>Prijavi izgubljeno žival</Button>);
		const button = screen.getByRole('button', { name: 'Prijavi izgubljeno žival' });

		await fireEvent.press(button);

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(button).not.toBeBusy();
		expect(spinner()).toBeNull();
	});

	test('keeps the label, shows a spinner, is busy and ignores presses while loading', async () => {
		const onPress = jest.fn();
		await render(
			<Button loading onPress={onPress}>
				Pošlji
			</Button>
		);
		const button = screen.getByRole('button', { name: 'Pošlji' });

		await fireEvent.press(button);

		expect(button).toBeBusy();
		expect(screen.getByText('Pošlji')).toBeOnTheScreen();
		expect(spinner()).toBeOnTheScreen();
		// Still enabled (not disabled), so screen reader focus stays on it while the action runs.
		expect(button).toBeEnabled();
		expect(onPress).not.toHaveBeenCalled();
	});

	test('puts the spinner in place of the leading icon', async () => {
		await render(
			<Button variant="ghost" loading>
				<Icon as={ShareNetworkIcon} testID="icon" />
				Deli ali natisni plakat
			</Button>
		);

		expect(screen.queryByTestId('icon', { includeHiddenElements: true })).toBeNull();
		expect(spinner()).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: 'Deli ali natisni plakat' })).toBeOnTheScreen();
	});
});
