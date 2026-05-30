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
  // C element type for the global array storage (e.g. "double"). number arrays
  // lower to double[]; the length sentinel in slot [0] is a valid double too.
  elementType: string;
}

export interface ObjectDeclaration {
  name: string;
  properties: {
    name: string;
    value: string;
  }[];
}

// A lowered object shape: a named C struct typedef. Shapes with identical
// (sorted) field:type signatures collapse to the same struct name, so the same
// object type is one C type everywhere (params, returns, vars, array elements).
export interface StructDeclaration {
  // The derived stable struct name, e.g. "Obj_a_double".
  name: string;
  // Fields in declaration order: { fieldName, cType } for the typedef body.
  fields: { name: string; cType: string }[];
}

export interface EmitterOption {
  checker: ts.TypeChecker;
  envRecord: EnvRecord;
  fns: CFunction[];
  catchVariable?: string;
  arrays?: ArrayDeclaration[];
  objects?: ObjectDeclaration[];
  // Registry of object struct typedefs to emit in the C preamble, keyed by the
  // struct's stable name (so identical shapes are declared exactly once).
  structs?: Map<string, StructDeclaration>;
  // Set of variable names that are captured from outer scopes
  // These should be accessed via closure_ctx->varName
  capturedVars?: Set<string>;
  // Name of the closure context parameter (e.g., "closure_ctx")
  closureCtxName?: string;
  // Raw C statements to prepend as the FIRST statements of the next block
  // (e.g. a function's closure-context setup). Consumed by blockEmitter and not
  // propagated into nested blocks (Theme 4: structured closure setup).
  prependStatements?: string[];
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
