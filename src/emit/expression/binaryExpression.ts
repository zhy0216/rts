import { Emitter } from "../../type";
import ts, { SyntaxKind } from "typescript";
import { getEmitNode, isCompoundAssignment, union } from "../helper.ts";

const getOperator = (operator: ts.BinaryOperatorToken): string => {
  if (operator.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return "==";
  }

  return operator.getText();
};

export const binaryExpressionEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option,
) => {
  const leftEmitNode = getEmitNode(node.left, option);
  const rightEmitNode = getEmitNode(node.right, option);

  return {
    emit: () => {
      const left = leftEmitNode.emit();
      const right = rightEmitNode.emit();
      const needParent = ts.isBinaryExpression(node.parent);
      const expressionString = `${left} ${getOperator(
        node.operatorToken,
      )} ${right}`;

      return needParent ? `(${expressionString})` : expressionString;
    },
    getVariables: () => {
      if (
        isCompoundAssignment(node.operatorToken.kind) ||
        node.operatorToken.kind & SyntaxKind.EqualsToken
      ) {
        return union(rightEmitNode.getVariables());
      }
      return union(leftEmitNode.getVariables(), rightEmitNode.getVariables());
    },
  };
};
