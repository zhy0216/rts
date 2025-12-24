import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for instanceof expressions
 * This implements the JavaScript instanceof operator in C
 */
export const instanceofEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option
) => {
  // Get the left expression (object) and right expression (constructor)
  const leftEmitter = getEmitNode(node.left, option);
  const rightEmitter = getEmitNode(node.right, option);

  return {
    emit: () => {
      const left = leftEmitter.emit();
      const right = rightEmitter.emit();

      // In JavaScript, instanceof checks if an object has a constructor's prototype
      // In our simplified C implementation, we'll use a helper function
      return `rts_instanceof(${left}, ${right})`;
    },

    getAllVars: () => {
      return union(leftEmitter.getAllVars(), rightEmitter.getAllVars());
    },
  };
};
