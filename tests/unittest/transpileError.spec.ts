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

  it('lowers an object-typed function parameter to a C struct (Theme 2)', () => {
    // Object shapes now lower to named C structs, so an object-typed parameter
    // and return are supported by value. Transpilation must succeed and the
    // emitted C must reference the struct (not leak "undefined" as a C type).
    const objectParam = `function getA(o: { a: number }): number {\n  return o.a;\n}\nconsole.log(getA({ a: 1 }));`;

    const c = transpile(objectParam);
    expect(c).not.toContain('undefined');
    // The object shape becomes a named struct typedef.
    expect(c).toContain('typedef struct');
    expect(c).toContain('Obj_a');
  });
});
