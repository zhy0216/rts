import ts from "typescript";

export interface AstNode {
  getAllVars: () => Set<ts.Identifier>;
  emit: () => string;
}

export interface CFunction {
  declare: string;
  implementation: string;
  closure?: {};
}

export interface EmitterOption {
  checker: ts.TypeChecker;
  envRecord: EnvRecord;
  fns: CFunction[]; // this may not enough, but let me try
  catchVariable?: string; // For try-catch statements to pass error variable
}

export type Emitter<T = ts.Node> = (node: T, option: EmitterOption) => AstNode;

// https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-environment-records
export interface EnvRecord {
  closureName?: string;
  name: string;
  parent?: EnvRecord;
  children: EnvRecord[];
  allVars: Set<ts.Identifier>;
  boundVars: Set<ts.Identifier>;
}
