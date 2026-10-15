import { QueryClient } from '@tanstack/react-query';

// In memory only: no persister, nothing private on the device (ADR-019).
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2 } } });
