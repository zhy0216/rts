import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for void expressions
 * This implements the JavaScript void operator in C
 */
export const voidEmitter: Emitter<ts.VoidExpression> = (node, option) => {
  // Get the expression being evaluated
  const expressionEmitter = getEmitNode(node.expression, option);

  return {
    emit: () => {
      const expression = expressionEmitter.emit();

      // In JavaScript, void evaluates its operand and then returns undefined
      // In C, we'll evaluate the expression and return 0 (representing undefined)
      return `(${expression}, 0)`;
    },

    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
