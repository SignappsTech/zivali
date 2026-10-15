// A free TCP port for a test server, so parallel worktrees never share one. Sync (Playwright configs cannot await).
import { execFileSync } from 'node:child_process';

const probe =
	"const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})";

export const freePort = () => Number(execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8' }).trim());
