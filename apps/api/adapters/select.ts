import { AppError } from '../lib/errors.ts';

// Provider selection shared by every adapter: no provider or missing credentials means the mock outside
// production; production never falls back to a mock (fail fast with the variable name). `off` switches the
// adapter off explicitly (any environment): its methods throw SERVICE_UNAVAILABLE.
export function pickProvider<P extends string>(
	name: string,
	provider: P | 'mock' | 'off' | undefined,
	hasCredentials: boolean,
	production: boolean
): P | 'mock' | 'off' {
	if (provider === 'off') return 'off';
	if (production) {
		if (!provider || provider === 'mock' || !hasCredentials) {
			throw new Error(`${name}: a real provider with credentials (or "off") is required in production`);
		}
		return provider;
	}
	return !provider || !hasCredentials ? 'mock' : provider;
}

export function offAdapter<T extends object>(name: string): T {
	return new Proxy({} as T, {
		get: (_t, prop) =>
			typeof prop === 'symbol' || prop === 'then'
				? undefined
				: () => {
						throw new AppError('SERVICE_UNAVAILABLE', `${name}: feature not enabled`);
					},
	});
}
