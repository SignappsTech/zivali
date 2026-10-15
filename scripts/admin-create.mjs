// `pnpm admin:create <email> [--i-know-this-is-production]`: runs apps/api/scripts/admin-create.ts with tsx, since it
// needs the API's config, Prisma client and domain functions. Bootstrap of the first admin (ADR-018); a CLI only.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../apps/api/', import.meta.url));
// --import tsx resolves from cwd (apps/api has tsx); no shell, so the arguments reach the script unchanged.
const { status, error } = spawnSync(
	process.execPath,
	['--import', 'tsx', 'scripts/admin-create.ts', ...process.argv.slice(2)],
	{ cwd, stdio: 'inherit' }
);
if (error) throw error;
process.exit(status ?? 1);
