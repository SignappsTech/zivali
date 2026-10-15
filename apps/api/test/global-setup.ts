// Once per run: bring the local database up to the committed migrations (non-destructive).
import { execSync } from 'node:child_process';

export default function setup(): void {
	execSync('prisma migrate deploy', { stdio: 'inherit' });
}
