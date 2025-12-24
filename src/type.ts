import ts from 'typescript';

export interface AstNode {
  getAllVars: () => Set<ts.Identifier>;
  emit: () => string;
}

export interface CFunction {
  declare: string;
  implementation: string;
  closure?: {};
}

export interface ArrayDeclaration {
  name: string;
  values: string;
}

export interface ObjectDeclaration {
  name: string;
  properties: {
    name: string;
    value: string;
  }[];
}

export interface EmitterOption {
  checker: ts.TypeChecker;
  envRecord: EnvRecord;
  fns: CFunction[];
  catchVariable?: string;
  arrays?: ArrayDeclaration[];
  objects?: ObjectDeclaration[];
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
