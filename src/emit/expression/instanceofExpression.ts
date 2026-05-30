import { Emitter } from '../../type';
import ts from 'typescript';
import { getClassRegistry, getEmitNode, union } from '../helper';

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

      // Theme 5: for a class right-hand side, compare the instance's stored
      // __type_id tag against that class's id (looked up in the registry).
      const cls = getClassRegistry().get(node.right.getText());
      if (cls) {
        return `((${left}) != NULL && ((${cls.cName}*)(${left}))->__type_id == ${cls.typeId})`;
      }

      // Fallback for a non-class right-hand side.
      return `rts_instanceof(${left}, ${rightEmitter.emit()})`;
    },

    getAllVars: () => {
      return union(leftEmitter.getAllVars(), rightEmitter.getAllVars());
    },
  };
};
