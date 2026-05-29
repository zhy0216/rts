import fs from 'fs';
import path from 'path';
import { transpile } from '../src/program';
import { it, expect } from 'bun:test';

export const testFixtures = (fixturePath: string) => {
  fs.readdirSync(fixturePath)
    .filter((f) => f.endsWith('rts'))
    .forEach((file) => {
      it(`test ${file}`, async () => {
        const filePath = [fixturePath, file].join(path.sep);
        const sourceCode = await fs.promises.readFile(filePath, {
          encoding: 'utf8',
          flag: 'r',
        });
        const expectOutput = await fs.promises.readFile(filePath + '.expect', {
          encoding: 'utf8',
          flag: 'r',
        });
        const cCode = transpile(sourceCode);
        // Use path.basename to get just the directory name, not the full path
        const fixtureName = path.basename(fixturePath);
        // Create a proper temp directory structure
        const tempDir = `/tmp/rts-tests/${fixtureName}`;
        // Ensure the directory exists
        fs.mkdirSync(tempDir, { recursive: true });
        const exePath = `${tempDir}/${file.slice(0, -4)}`;
        const cFile = Bun.file(`${exePath}.c`);
        await Bun.write(cFile, cCode);
        // Remove any stale binary so a failed compile can't silently pass on a
        // previous run's leftover artifact.
        if (fs.existsSync(exePath)) {
          fs.rmSync(exePath);
        }
        const proc = Bun.spawn(['cc', `${exePath}.c`, '-o', exePath], {
          stderr: 'pipe',
        });
        const ccStderr = await new Response(proc.stderr).text();
        await proc.exited;
        if (proc.exitCode !== 0) {
          throw new Error(
            `cc failed to compile ${file} (exit ${proc.exitCode}):\n${ccStderr}`
          );
        }
        const r = Bun.spawn([exePath]);
        const output = await new Response(r.stdout).text();
        await r.exited;
        expect(output).toEqual(expectOutput);
        expect(r.exitCode).toEqual(0);
      });
    });
};
