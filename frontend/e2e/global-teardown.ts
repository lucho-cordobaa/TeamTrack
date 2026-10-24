import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const backendDirectory = fileURLToPath(new URL('../../backend', import.meta.url));

export default function globalTeardown() {
  execFileSync(process.execPath, [join(backendDirectory, 'node_modules/ts-node/dist/bin.js'), 'prisma/e2e-cleanup.ts'], {
    cwd: backendDirectory,
    stdio: 'inherit',
  });
}
