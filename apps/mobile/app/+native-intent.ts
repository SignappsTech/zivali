import { toAppPath } from '@/lib/deep-link';

// Universal / App Links and zivali:// arrive here before routing (Expo Router).
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
	return toAppPath(path);
}
