import { Emitter } from "../../type";
import ts, { SyntaxKind } from "typescript";
import { getEmitNode, isCompoundAssignment, union } from "../helper.ts";

const getOperator = (operator: ts.BinaryOperatorToken): string => {
  switch (operator.kind) {
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return "==";
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return "!=";
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      // Unsigned right shift in C
      // Implementing as a combination of right shift and bitwise operations
      // Note: this is simplified and would need more accurate handling for full implementation
      return ">>"; // We'll handle the unsigned conversion in the emit method
    default:
      return operator.getText();
  }
};

// Maps compound assignment operators to their simple binary operator equivalent
const compoundToSimpleOperator = (kind: ts.SyntaxKind): string => {
  switch (kind) {
    case ts.SyntaxKind.PlusEqualsToken:
      return "+";
    case ts.SyntaxKind.MinusEqualsToken:
      return "-";
    case ts.SyntaxKind.AsteriskEqualsToken:
      return "*";
    case ts.SyntaxKind.SlashEqualsToken:
      return "/";
    case ts.SyntaxKind.PercentEqualsToken:
      return "%";
    case ts.SyntaxKind.LessThanLessThanEqualsToken:
      return "<<";
    case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      return ">>";
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      return ">>>";
    case ts.SyntaxKind.AmpersandEqualsToken:
      return "&";
    case ts.SyntaxKind.CaretEqualsToken:
      return "^";
    case ts.SyntaxKind.BarEqualsToken:
      return "|";
    default:
      return "="; // Default to simple assignment
  }
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
      
      // Handle compound assignments
      if (isCompoundAssignment(node.operatorToken.kind)) {
        const operator = compoundToSimpleOperator(node.operatorToken.kind);
        const expressionString = `${left} = ${left} ${operator} ${right}`;
        return needParent ? `(${expressionString})` : expressionString;
      }
      
      // Special handling for unsigned right shift operator (>>>)
      if (node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken) {
        // In C, unsigned right shift requires typecasting to handle it properly
        // We'll use a combination of right shift and bitwise AND to simulate JavaScript's >>> behavior
        const expressionString = `(unsigned int)${left} >> ${right}`;
        return needParent ? `(${expressionString})` : expressionString;
      }
      
      const expressionString = `${left} ${getOperator(
        node.operatorToken,
      )} ${right}`;

      return needParent ? `(${expressionString})` : expressionString;
    },
    getAllVars: () => {
      if (
        isCompoundAssignment(node.operatorToken.kind) ||
        node.operatorToken.kind & SyntaxKind.EqualsToken
      ) {
        return union(rightEmitNode.getAllVars());
      }
      return union(leftEmitNode.getAllVars(), rightEmitNode.getAllVars());
    },
  };
};
