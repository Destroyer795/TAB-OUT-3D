import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

let count = 0;
async function check(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await check(path);
        else if (/\.(m?js)$/.test(entry.name)) {
            const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8', windowsHide: true });
            if (result.status !== 0) { process.stderr.write(result.stderr); process.exitCode = 1; }
            count++;
        }
    }
}
await check('src');
await check('scripts');
await check('tests');
console.log(`Checked ${count} JavaScript modules.`);
