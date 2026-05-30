import { it, describe, expect } from 'bun:test';
import { transpileProgram } from '../../src/program';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Theme 6: compile a multi-file rts program (linked into one C translation unit)
// and run it, mirroring the fixture harness inline.
const compileAndRun = (cCode: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'rts-modtest-'));
  const cfile = join(dir, 'mod.c');
  const bin = join(dir, 'mod');
  writeFileSync(cfile, cCode);
  const cc = Bun.spawnSync(['cc', cfile, '-o', bin], { stderr: 'pipe' });
  if (cc.exitCode !== 0) {
    throw new Error(
      `cc failed (exit ${cc.exitCode}):\n${new TextDecoder().decode(cc.stderr)}`
    );
  }
  const r = Bun.spawnSync([bin]);
  return new TextDecoder().decode(r.stdout);
};

describe('Modules (import / export across files)', () => {
  it('imports an exported function and const from another module', () => {
    const c = transpileProgram([
      {
        name: 'a.ts',
        source:
          'export function add(x: number, y: number): number { return x + y }\n' +
          'export const TEN = 10',
      },
      {
        name: 'main.ts',
        source:
          'import { add, TEN } from "./a"\n' +
          'console.log(add(2, 3))\n' +
          'console.log(add(TEN, 5))',
      },
    ]);
    expect(compileAndRun(c)).toEqual('5\n15\n');
  });

  it('catches cross-file type errors via the diagnostics gate', () => {
    expect(() =>
      transpileProgram([
        {
          name: 'a.ts',
          source:
            'export function add(x: number, y: number): number { return x + y }',
        },
        {
          name: 'main.ts',
          source: 'import { add } from "./a"\nconsole.log(add("hi", 3))',
        },
      ])
    ).toThrow();
  });
});
