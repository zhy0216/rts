import { Emitter } from "../../type";
import ts from "typescript";

export const literalEmitter: Emitter<
  ts.NumericLiteral | ts.BooleanLiteral | ts.StringLiteral
> = (node) => ({
  emit: () => node.getText(),
});
