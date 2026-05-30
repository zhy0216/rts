import { it, describe, expect } from 'bun:test';
import { transpile } from '../../src/program';

describe('Transpile Error Handling', () => {
  // A first-class function VALUE (function-typed parameter/return) still has no C
  // representation, so emission must fail loudly with a "not support" error
  // rather than leaking the token `undefined` as a C type. (Escaping closures /
  // first-class function values remain unimplemented — see docs/roadmad/0.0.3.md
  // Theme 4.)
  it('should throw an error for an unlowerable (function-value) type', () => {
    const unsupportedCode = `function call(cb: () => number): number {\n  return cb();\n}`;
    expect(() => transpile(unsupportedCode)).toThrow();
  });

  it('should throw a descriptive "not support" error for an unlowerable type', () => {
    const unsupportedCode = `function call(cb: () => number): number {\n  return cb();\n}`;
    expect(() => transpile(unsupportedCode)).toThrow('not support');
  });

  // Object-typed function parameters now lower to a by-value C struct (Theme 2),
  // so this is accepted rather than throwing "not support" as it once did.
  it('now supports object-typed function parameters (Theme 2)', () => {
    const objectParam = `function getA(o: { a: number }): number {\n  return o.a;\n}\nconsole.log(getA({ a: 1 }));`;
    expect(() => transpile(objectParam)).not.toThrow();
  });

  // Class declarations now lower to a C struct + standalone receiver-passing
  // functions (Theme 5), so they no longer hit the "not support" path.
  it('now supports class declarations (Theme 5)', () => {
    const cls = `class Foo {\n  x: number\n  constructor(x: number) { this.x = x }\n}\nconsole.log(new Foo(1).x);`;
    expect(() => transpile(cls)).not.toThrow();
  });
});
