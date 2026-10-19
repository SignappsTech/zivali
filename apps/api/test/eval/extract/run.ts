// `pnpm --filter api eval:extract [--model <id>]` (ADR-012 §Model decision, gate; TASK-40.5; README.md): the
// synthetic set on the mock adapter (mechanics only), then the real-photo set from its recorded replies. Offline unless
// EVAL_EXTRACT=anthropic. Exit code 1 when the real set misses an ADR-012 bar.
import { parseArgs } from 'node:util';

import { report } from './harness.ts';
import { realRun } from './real.ts';
import { syntheticItems } from './synthetic.ts';

// pnpm passes a literal `--` through when one is typed before the flags.
const { values } = parseArgs({
	args: process.argv.slice(2).filter((arg) => arg !== '--'),
	options: { model: { type: 'string', default: 'claude-haiku-5-5' } },
});
const model = values.model;

const synthetic = report(
	'Synthetic set (mock adapter; mechanics only, its results are not for ADR-012)',
	model,
	await syntheticItems(model)
);
const real = await realRun(process.env, model);
process.stdout.write(`${synthetic.text}\n${real.text}`);
if (real.pass === false) process.exitCode = 1;
