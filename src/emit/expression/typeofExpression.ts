import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for typeof expressions
 * This implements the JavaScript typeof operator in C
 */
export const typeofEmitter: Emitter<ts.TypeOfExpression> = (node, option) => {
  // Get the expression being checked
  const expressionEmitter = getEmitNode(node.expression, option);

  return {
    emit: () => {
      const expression = expressionEmitter.emit();

      // In a real implementation, we would need to check runtime types
      // For this simple version, we'll just simulate basic type checking for numbers and strings

      // Create a helper function to simulate typeof in C
      // For now, we'll return a simplified result as a string
      return `rts_typeof(${expression})`;
    },

    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
