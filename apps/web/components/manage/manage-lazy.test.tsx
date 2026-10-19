import { cleanup, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('./manage-page', () => ({ ManagePage: () => 'claim island' }));
vi.mock('@/components/store-provider', () => ({
	StoreProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="store">{children}</div>,
}));

class Boundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
	state: { error?: Error } = {};
	static getDerivedStateFromError(error: Error) {
		return { error };
	}
	render() {
		return this.state.error ? <p>boundary: {this.state.error.message}</p> : this.props.children;
	}
}

async function renderLazy() {
	const { ManageLazy } = await import('./manage-lazy');
	render(
		<Boundary>
			<ManageLazy>
				<p>server skeleton</p>
			</ManageLazy>
		</Boundary>
	);
}

beforeEach(() => {
	vi.resetModules();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it('shows the server skeleton until the island loads, then the claim page inside the store', async () => {
	await renderLazy();
	expect(screen.getByText('server skeleton')).toBeTruthy();
	expect((await screen.findByTestId('store')).textContent).toBe('claim island');
	expect(screen.queryByText('server skeleton')).toBeNull();
});

it("hands a failed island download to the page's error boundary", async () => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	// The island's chunk fails to download, as on a lost connection.
	vi.doMock('./manage-page', () => {
		throw new Error('Failed to fetch dynamically imported module');
	});
	await renderLazy();
	expect(await screen.findByText(/^boundary: /)).toBeTruthy();
	expect(screen.queryByText('server skeleton')).toBeNull();
});
