import ts from "typescript";

export interface EmitNode {
  emit: () => string;
}

export interface EmitterOption {
  checker: ts.TypeChecker;
  envRecord: EnvRecord;
  fns: string[]; // this may not enough, but let me try
}

export type Emitter<T = ts.Node> = (node: T, option: EmitterOption) => EmitNode;

// https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records
export interface EnvRecord {
  parent?: EnvRecord;
  identifiers: ts.Identifier[];
}
