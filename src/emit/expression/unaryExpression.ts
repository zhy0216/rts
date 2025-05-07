import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper.ts";

export const unaryExpressionEmitter: Emitter<ts.PrefixUnaryExpression | ts.PostfixUnaryExpression> = (node, option) => {
  const operandEmitNode = getEmitNode(node.operand, option);

  return {
    emit: () => {
      const operand = operandEmitNode.emit();
      
      // Process based on the kind of operator
      switch (node.operator) {
        case ts.SyntaxKind.ExclamationToken: // Logical NOT (!)
          // In C, logical NOT should return 0 for true expressions and 1 for false expressions
          // So we use the expression: !(operand) ? 1 : 0
          return `(!(${operand}) ? 1 : 0)`;
        case ts.SyntaxKind.PlusToken: // Unary plus (+)
          return `+(${operand})`;
        case ts.SyntaxKind.MinusToken: // Unary minus (-)
          return `-(${operand})`;
        case ts.SyntaxKind.TildeToken: // Bitwise NOT (~)
          return `~(${operand})`;
        case ts.SyntaxKind.PlusPlusToken: // Increment (++)
          if (ts.isPostfixUnaryExpression(node)) {
            return `(${operand}++)`;
          } else {
            return `(++${operand})`;
          }
        case ts.SyntaxKind.MinusMinusToken: // Decrement (--)
          if (ts.isPostfixUnaryExpression(node)) {
            return `(${operand}--)`;
          } else {
            return `(--${operand})`;
          }
        default:
          return `(${operand})`; // Fallback case
      }
    },

    getAllVars: () => operandEmitNode.getAllVars(),
  };
};
