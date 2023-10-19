import ts from "typescript";

export interface EmitNode {
  emit: () => string;
}

export interface EmitterOption {
  checker: ts.TypeChecker;
}

export type Emitter<T = ts.Node> = (
  node: T,
  option: EmitterOption,
) => EmitNode | undefined;
