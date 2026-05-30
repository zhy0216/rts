import { Emitter } from '../../type';
import ts from 'typescript';
import {
  getEmitNode,
  isClassInstanceType,
  isLowerableObjectType,
} from '../helper';

/**
 * Emitter for property access expressions (obj.property).
 *
 * Theme 5: a class instance is a POINTER to its C struct, so field access uses
 * the pointer-deref form `(expr)->field`. Theme 2: a plain object literal type
 * is a by-value struct, so it uses `(expr).field`. The checker distinguishes the
 * two. The receiver is parenthesised so compound literals and calls compose.
 */
export const propertyAccessEmitter: Emitter<ts.PropertyAccessExpression> = (
  node,
  option
) => {
  const { checker } = option;
  const expressionEmitter = getEmitNode(node.expression, option);
  const propertyName = node.name.getText();

  return {
    emit: () => {
      const expression = expressionEmitter.emit();
      const receiverType = checker.getTypeAtLocation(node.expression);

      // Class instance receiver -> pointer-deref field access.
      if (isClassInstanceType(receiverType)) {
        return `(${expression})->${propertyName}`;
      }

      // Object-typed receiver -> by-value C struct field access.
      if (isLowerableObjectType(receiverType)) {
        return `(${expression}).${propertyName}`;
      }

      // Non-object receivers (e.g. host members) fall back to the raw form.
      return `${expression}.${propertyName}`;
    },

    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
