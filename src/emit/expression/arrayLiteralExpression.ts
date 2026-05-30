import { Emitter } from '../../type';
import ts from 'typescript';
import { arrayElementCType, getEmitNode, union } from '../helper';

/**
 * Emitter for array literal expressions
 * In C, we'll implement this as a statically-sized array and return a pointer to it
 */
export const arrayLiteralEmitter: Emitter<ts.ArrayLiteralExpression> = (
  node,
  option
) => {
  const { checker } = option;
  // Process each element of the array
  const elementEmitters = node.elements.map((element) =>
    getEmitNode(element, option)
  );

  // Lower the element type so a number array becomes double[]. The slot-[0]
  // count is a plain integer literal, which is a valid double initializer.
  const elementCType = arrayElementCType(checker.getTypeAtLocation(node));

  // Generate a unique ID for this array to avoid naming conflicts
  const arrayId = `array_${node.pos}_${node.end}`;

  return {
    emit: () => {
      // For each element in the array, emit its C representation
      const elementStrings = elementEmitters.map((emitter) => emitter.emit());

      // Store the element count in slot [0] so the length travels with the
      // array data: a pointer to the array still recovers the length via [0].
      // (This replaces the old 0-sentinel scheme, under which a real 0 element
      // truncated for-of iteration.) for-of reads the count from index 0 and
      // the elements from index 1 onward.
      const arrayValues = [
        String(elementStrings.length),
        ...elementStrings,
      ].join(', ');

      // Register this array in global declarations
      if (!option.arrays) {
        option.arrays = [];
      }

      option.arrays.push({
        name: arrayId,
        values: arrayValues,
        elementType: elementCType,
      });

      // Return the array name which in C context is equivalent to a pointer to the first element
      return arrayId;
    },

    getAllVars: () => {
      // Combine variables from all array elements
      return union(...elementEmitters.map((emitter) => emitter.getAllVars()));
    },
  };
};
