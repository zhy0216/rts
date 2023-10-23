import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper.ts";

export const ifStatementEmitter: Emitter<ts.IfStatement> = (node, option) => ({
  emit: () => {
    const conditionString = getEmitNode(node.expression, option).emit();
    const conditionString2 =
      ts.isLiteralTypeNode(node.expression) || ts.isIdentifier(node.expression)
        ? `(${conditionString})`
        : conditionString;
    const thenString = getEmitNode(node.thenStatement, option).emit();
    const elseString = node.elseStatement
      ? "else " + getEmitNode(node.elseStatement, option).emit()
      : "";

    return `if${conditionString2} ${thenString} ${elseString}`;
  },
});
