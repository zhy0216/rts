import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for property access expressions (obj.property)
 * This allows accessing properties of objects
 */
export const propertyAccessEmitter: Emitter<ts.PropertyAccessExpression> = (
  node,
  option
) => {
  // Get the expression being accessed (the object)
  const expressionEmitter = getEmitNode(node.expression, option);

  // Get the property name
  const propertyName = node.name.getText();

  return {
    emit: () => {
      // Check if the expression is an identifier that has an object binding
      if (ts.isIdentifier(node.expression)) {
        const varName = node.expression.getText();
        const objectId = option.objectBindings?.get(varName);
        if (objectId) {
          // Use the object ID for property access
          return `${objectId}_${propertyName}`;
        }
      }

      // Fallback: use the expression directly
      const expression = expressionEmitter.emit();
      return `${expression}_${propertyName}`;
    },

    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
