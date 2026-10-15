import { checkoutOpen } from '@/lib/checkout';
import { toAppPath } from '@/lib/deep-link';

// Universal / App Links and zivali:// arrive here before routing (Expo Router).
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
	const appPath = toAppPath(path);
	// Android hands the checkout return to the in-app browser session and to the router; the open hand-off sheet shows
	// the result itself, so the router skips it (null). A cold start (initial) still opens /payments/return.
	if (!initial && checkoutOpen() && appPath.startsWith('/payments/return')) return null;
	return appPath;
}
