import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, isLowerableObjectType } from '../helper';

/**
 * Emitter for property access expressions (obj.property) (Theme 2).
 *
 * Resolves `expr.prop` to a real C struct field access `(expr).prop` for ANY
 * object-typed expression (identifiers, parameters, call results, array
 * elements), using the checker to confirm the receiver is a lowerable object
 * shape. The receiver is parenthesised so compound literals and calls compose.
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

      // Object-typed receiver -> C struct field access.
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
