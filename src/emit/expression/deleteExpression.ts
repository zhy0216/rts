import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for delete expressions
 * This implements the JavaScript delete operator in C
 */
export const deleteEmitter: Emitter<ts.DeleteExpression> = (node, option) => {
  // Get the expression being deleted
  const expressionEmitter = getEmitNode(node.expression, option);

  return {
    emit: () => {
      const expression = expressionEmitter.emit();

      // In JavaScript, delete removes a property from an object
      // In our C implementation, we'll use a helper function to simulate this behavior
      return `rts_delete_property(${expression})`;
    },

    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
