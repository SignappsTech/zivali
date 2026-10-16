// Runs before `next build` (apps/web prebuild). Agent worktrees can link node_modules to the main checkout through a
// directory junction; Next's standalone output then writes .next/standalone/node_modules as a link into that
// node_modules, and the next build removes and copies through it. On 2026-10-16 that deleted packages from the main
// checkout's node_modules. So: refuse to build when node_modules is a link, and unlink (never follow) any link left
// under .next/standalone from an earlier build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** A symlink, or a Windows junction (Node's lstat reports junctions as symbolic links). */
export const isLink = (p) => {
	try {
		return fs.lstatSync(p).isSymbolicLink();
	} catch {
		return false;
	}
};

/** Removes every link under `dir` as a link, without descending into it; returns the removed paths. */
export function unlinkLinks(dir, removed = []) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return removed;
	}
	for (const entry of entries) {
		const p = path.join(dir, entry.name);
		if (isLink(p)) {
			// rmdirSync removes a junction itself on Windows; unlinkSync handles file and directory symlinks elsewhere.
			try {
				fs.unlinkSync(p);
			} catch {
				fs.rmdirSync(p);
			}
			removed.push(p);
		} else if (entry.isDirectory()) unlinkLinks(p, removed);
	}
	return removed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const web = process.cwd();
	const root = path.resolve(web, '../..');
	const linked = [path.join(root, 'node_modules'), path.join(web, 'node_modules')].filter(isLink);
	if (linked.length && process.env.ALLOW_LINKED_NODE_MODULES_BUILD !== '1') {
		console.error(
			`build-guard: ${linked.join(', ')} is a link (junction). A production build here would write through it into ` +
				'another checkout. Use a private install in this worktree (remove the junction with `cmd /c rmdir node_modules`, ' +
				'then `pnpm install --frozen-lockfile --offline`), or build in the main checkout.'
		);
		process.exit(1);
	}
	const removed = unlinkLinks(path.join(web, '.next', 'standalone'));
	if (removed.length) console.log(`build-guard: unlinked ${removed.length} link(s) under .next/standalone`);
}
