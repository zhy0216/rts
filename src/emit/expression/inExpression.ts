import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for 'in' expressions
 * This implements the JavaScript 'in' operator in C
 */
export const inExpressionEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option
) => {
  // Get the left expression (property name) and right expression (object)
  const leftEmitter = getEmitNode(node.left, option);
  const rightEmitter = getEmitNode(node.right, option);

  return {
    emit: () => {
      const left = leftEmitter.emit();
      const right = rightEmitter.emit();

      // For our simplified implementation, we'll use a helper function
      // that simulates checking if a property exists in an object
      return `rts_has_property(${right}, ${left})`;
    },

    getAllVars: () => {
      return union(leftEmitter.getAllVars(), rightEmitter.getAllVars());
    },
  };
};
