import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

/**
 * Emitter for comma expressions
 * This implements the JavaScript comma operator in C
 */
export const commaEmitter: Emitter<ts.BinaryExpression> = (node, option) => {
  // Get the left and right expressions
  const leftEmitter = getEmitNode(node.left, option);
  const rightEmitter = getEmitNode(node.right, option);
  
  return {
    emit: () => {
      const left = leftEmitter.emit();
      const right = rightEmitter.emit();
      
      // In JavaScript, the comma operator evaluates each of its operands (from left to right) 
      // and returns the value of the last operand
      // In C, we can use the comma operator directly
      return `(${left}, ${right})`;
    },
    
    getAllVars: () => {
      return union(leftEmitter.getAllVars(), rightEmitter.getAllVars());
    },
  };
};
