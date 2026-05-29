import { it, describe, expect } from 'bun:test';
import { transpile } from '../../src/program';

describe('Transpile Error Handling', () => {
  it('should throw an error when encountering unsupported syntax', () => {
    // Class declarations are not supported
    const unsupportedCode = `class Foo { }`;

    expect(() => transpile(unsupportedCode)).toThrow();
  });

  it('should throw an error with descriptive message for unsupported syntax', () => {
    // Class declarations are not supported
    const unsupportedCode = `class Foo { }`;

    expect(() => transpile(unsupportedCode)).toThrow('not support');
  });

  it('should fail loudly (not emit the token "undefined") for an object-typed function parameter', () => {
    // The diagnostics gate accepts this (it is well-typed TypeScript), but
    // there is no C type for an object yet, so emission must throw a clear
    // "not support" error instead of leaking `undefined` as a C type.
    const objectParam = `function getA(o: { a: number }): number {\n  return o.a;\n}\nconsole.log(getA({ a: 1 }));`;

    expect(() => transpile(objectParam)).toThrow('not support');
  });
});
