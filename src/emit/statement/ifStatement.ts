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
    const thenString2 = ts.isIfStatement(node.thenStatement)
      ? "else" + thenString
      : thenString;
    const elseString = node.elseStatement
      ? getEmitNode(node.elseStatement, option).emit()
      : "";

    return `if${conditionString2} ${thenString2} ${elseString}`;
  },
});
