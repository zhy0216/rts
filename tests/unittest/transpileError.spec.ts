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
});
