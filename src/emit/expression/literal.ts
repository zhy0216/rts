import { Emitter } from "../../type";
import ts, { SyntaxKind } from "typescript";

export const literalEmitter: Emitter<
  ts.NumericLiteral | ts.BooleanLiteral | ts.StringLiteral | ts.NullLiteral
> = (node) => ({
  emit: () => {
    if (node.kind === SyntaxKind.TrueKeyword) {
      return "1";
    }

    if (node.kind === SyntaxKind.FalseKeyword) {
      return "0";
    }
    
    if (node.kind === SyntaxKind.NullKeyword) {
      return "0"; // In C, NULL is often represented as 0
    }

    return node.getText();
  },
  getAllVars: () => new Set(),
});
