import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper.ts";

const getOperator = (operator: ts.BinaryOperatorToken): string => {
  if (operator.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return "==";
  }

  return operator.getText();
};

export const binaryExpressionEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option,
) => ({
  emit: () => {
    const left = getEmitNode(node.left, option).emit();
    const right = getEmitNode(node.right, option).emit();

    return `(${left} ${getOperator(node.operatorToken)} ${right})`;
  },
});
