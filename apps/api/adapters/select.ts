// Provider selection shared by every adapter: no provider or missing credentials means the mock outside
// production; production never falls back to a mock (fail fast with the variable name).
export function pickProvider<P extends string>(
	name: string,
	provider: P | 'mock' | undefined,
	hasCredentials: boolean,
	production: boolean
): P | 'mock' {
	if (production) {
		if (!provider || provider === 'mock' || !hasCredentials) {
			throw new Error(`${name}: a real provider with credentials is required in production`);
		}
		return provider;
	}
	return !provider || !hasCredentials ? 'mock' : provider;
}
