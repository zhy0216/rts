import { it, describe, expect } from 'bun:test';
import { transpile } from '../../src/program';

// The defining promise of rts is a *statically-typed* subset: ill-typed input
// must be rejected at transpile time, not silently emitted as (often invalid) C.
describe('Diagnostics gate (static type enforcement)', () => {
  describe('rejects ill-typed programs', () => {
    it('assigning a boolean to a number annotation', () => {
      expect(() => transpile(`let n: number = true;`)).toThrow();
    });

    it('changing a variable type at runtime (string into a number var)', () => {
      expect(() =>
        transpile(`let x = 5;\nx = "hello";\nconsole.log(x);`)
      ).toThrow();
    });

    it('an operator applied to incompatible types', () => {
      expect(() => transpile(`let z = 5 + true;\nconsole.log(z);`)).toThrow();
    });

    it('referencing an undeclared identifier', () => {
      expect(() => transpile(`console.log(missing);`)).toThrow();
    });

    it('passing the wrong argument type to a typed function', () => {
      expect(() =>
        transpile(`function f(x: number): number {\n  return x;\n}\nf("hi");`)
      ).toThrow();
    });

    it('returning the wrong type from a function', () => {
      expect(() =>
        transpile(`function f(): number {\n  return "x";\n}\nconsole.log(f());`)
      ).toThrow();
    });
    // Note: calling a non-function (e.g. `let n = 5; n();`) is NOT caught under
    // the minimal { noLib: true } lib — TS suppresses the "not callable" check
    // without the full standard library. Assignability/type-change violations
    // (the core "types don't change at runtime" guarantee) are enforced.
  });

  describe('accepts well-typed programs in the subset', () => {
    it('typed scalar + console.log', () => {
      expect(() =>
        transpile(`let x: number = 5;\nconsole.log(x);`)
      ).not.toThrow();
    });

    it('string literal logging', () => {
      expect(() => transpile(`console.log("hello");`)).not.toThrow();
    });

    it('array literal + for-of', () => {
      expect(() =>
        transpile(
          `let a = [1, 2, 3];\nfor (const n of a) {\n  console.log(n);\n}`
        )
      ).not.toThrow();
    });

    it('object literal + property access', () => {
      expect(() =>
        transpile(`let o = { a: 1, b: 2 };\nconsole.log(o.a);`)
      ).not.toThrow();
    });

    it('function declaration and call', () => {
      expect(() =>
        transpile(
          `function add(x: number, y: number): number {\n  return x + y;\n}\nconsole.log(add(1, 2));`
        )
      ).not.toThrow();
    });
  });
});
