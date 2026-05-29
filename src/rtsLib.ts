// Minimal ambient declarations for the rts subset.
//
// rts builds the TypeScript program with { noLib: true } so the language surface
// stays a controlled subset — the full DOM/ES standard library is intentionally
// absent. This file declares just the global *types* the checker needs in order
// to type-check the constructs rts supports (arrays, objects, strings, numbers,
// etc.) plus the few runtime globals rts actually implements (console).
//
// It is added to the program as a `.d.ts` declaration file, so it participates in
// type-checking but is never emitted to C (programEmitter filters declaration
// files out).
export const RTS_LIB_FILE_NAME = 'rts.lib.d.ts';

export const RTS_LIB_SOURCE = `
// --- Global types the checker resolves by name (kept intentionally minimal) ---
interface Boolean {}
interface Number {}
interface String {
  readonly length: number;
  readonly [index: number]: string;
}
interface Object {}
interface Function {}
interface IArguments {}
interface RegExp {}
interface Array<T> {
  length: number;
  [index: number]: T;
}

// --- Runtime globals rts implements ---
interface Console {
  log(...data: any[]): void;
}
declare var console: Console;
`;
