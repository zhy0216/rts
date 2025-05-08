import { Emitter } from "../../type";
import ts from "typescript";

/**
 * Emitter for 'this' expressions
 * This implements the JavaScript 'this' keyword in C
 */
export const thisEmitter: Emitter<ts.ThisExpression> = (node, option) => {
  return {
    emit: () => {
      // In JavaScript, 'this' refers to the current execution context
      // For a simplified implementation, we'll use a global 'this_context' variable
      return "this_context";
    },
    
    getAllVars: () => {
      // No variables used here
      return new Set();
    },
  };
};
