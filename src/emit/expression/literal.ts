import { Emitter } from "../../type";
import ts, { SyntaxKind } from "typescript";

export const literalEmitter: Emitter<
  ts.NumericLiteral | ts.BooleanLiteral | ts.StringLiteral
> = (node) => ({
  emit: () => {
    if (node.kind === SyntaxKind.TrueKeyword) {
      return "1";
    }

    if (node.kind === SyntaxKind.FalseKeyword) {
      return "0";
    }

    return node.getText();
  },
  getAllVars: () => new Set(),
});
