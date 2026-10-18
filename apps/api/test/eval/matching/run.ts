// `pnpm --filter api eval:matching` (C8 §Visual similarity 9, TASK-43.3; README.md): the synthetic set with the mock
// embedder, then the real-photo set when it exists. Offline unless EVAL_EMBED=voyage. Exit code 1 when shipped v3 is
// worse than v2 on the synthetic set (the same gate eval.test.ts runs in pnpm verify).
import { prepare, run } from './harness.ts';
import { realRun } from './real.ts';
import { syntheticSet, syntheticVector } from './synthetic.ts';

const synthetic = run(
	'Synthetic set (mock embedder labels; its picks are not for C8)',
	prepare(syntheticSet(), syntheticVector)
);
process.stdout.write(`${synthetic.text}\n${await realRun(process.env)}`);
if (!synthetic.pass) process.exitCode = 1;
