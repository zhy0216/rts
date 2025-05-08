import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

/**
 * Emitter for array literal expressions
 * In C, we'll implement this as a statically-sized array and return a pointer to it
 */
export const arrayLiteralEmitter: Emitter<ts.ArrayLiteralExpression> = (node, option) => {
  // Process each element of the array
  const elementEmitters = node.elements.map(element => getEmitNode(element, option));
  
  // Generate a unique ID for this array to avoid naming conflicts
  const arrayId = `array_${node.pos}_${node.end}`;
  
  return {
    emit: () => {
      // For each element in the array, emit its C representation
      const elementStrings = elementEmitters.map(emitter => emitter.emit());
      
      // Add a zero at the end to mark the end of the array for iteration
      // This is important for our custom for-of implementation
      elementStrings.push("0");
      
      // Generate C code for array initialization
      // In C, we define the array globally and return its name
      // which will be converted to a pointer when used
      const arrayValues = elementStrings.join(", ");
      
      // Register this array in global declarations
      if (!option.arrays) {
        option.arrays = [];
      }
      
      option.arrays.push({
        name: arrayId,
        values: arrayValues
      });
      
      // Return the array name which in C context is equivalent to a pointer to the first element
      return arrayId;
    },
    
    getAllVars: () => {
      // Combine variables from all array elements
      return union(...elementEmitters.map(emitter => emitter.getAllVars()));
    },
  };
};
