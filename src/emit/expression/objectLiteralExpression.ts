import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for object literal expressions
 * In C, we'll implement this with a simple structure that can represent an object
 */
export const objectLiteralEmitter: Emitter<ts.ObjectLiteralExpression> = (
  node,
  option
) => {
  // Generate a unique ID for this object to avoid naming conflicts
  const objectId = `obj_${node.pos}_${node.end}`;

  // Process each property in the object literal
  const propertyEmitters = node.properties
    .map((property) => {
      if (ts.isPropertyAssignment(property)) {
        const initializer = getEmitNode(property.initializer, option);
        return {
          name: property.name.getText(),
          emitter: initializer,
        };
      }
      // For now, we're only handling simple property assignments
      return null;
    })
    .filter(
      (
        prop
      ): prop is { name: string; emitter: ReturnType<typeof getEmitNode> } =>
        prop !== null
    );

  return {
    emit: () => {
      // For simplicity in this initial implementation, we'll return a pointer to a dummy object
      // In a more complete implementation, we would create a proper C structure

      // Register a global dummy object if needed
      if (!option.objects) {
        option.objects = [];
      }

      option.objects.push({
        name: objectId,
        properties: propertyEmitters.map((prop) => ({
          name: prop.name,
          value: prop.emitter.emit(),
        })),
      });

      // Return a dummy pointer that can be used with the for-in loop
      return `(void*)${objectId}`;
    },

    getAllVars: () => {
      // Combine variables from all property initializers
      return union(
        ...propertyEmitters.map((prop) => prop.emitter.getAllVars())
      );
    },
  };
};
