import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

/**
 * Emitter for throw statements
 * In C, we'll implement this by calling a custom error handling function
 */
export const throwStatementEmitter: Emitter<ts.ThrowStatement> = (node, option) => {
  const expressionEmitter = getEmitNode(node.expression, option);
  
  return {
    emit: () => {
      const expression = expressionEmitter.emit();
      
      // In C, we use a custom runtime error handling function to simulate JS throw
      return `rts_throw(${expression});`;
    },
    
    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
