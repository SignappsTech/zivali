// Runs a root script only once the piece it needs exists; until then it says which task adds it.
// Usage: node scripts/if-exists.mjs <path> <task-id> -- <command> [args...]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [path, task, separator, ...command] = process.argv.slice(2);

if (!path || !task || separator !== '--' || command.length === 0) {
  console.error('Usage: node scripts/if-exists.mjs <path> <task-id> -- <command> [args...]');
  process.exit(2);
}

if (!existsSync(path)) {
  console.log(`Skipped "${command.join(' ')}": ${path} does not exist yet (added by ${task}).`);
  process.exit(0);
}

// shell: true so Windows finds the .cmd shims in node_modules/.bin.
const { status, error } = spawnSync(command.join(' '), { stdio: 'inherit', shell: true });
if (error) throw error;
process.exit(status ?? 1);
