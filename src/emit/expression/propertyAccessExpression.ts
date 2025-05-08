import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

/**
 * Emitter for property access expressions (obj.property)
 * This allows accessing properties of objects
 */
export const propertyAccessEmitter: Emitter<ts.PropertyAccessExpression> = (node, option) => {
  // Get the expression being accessed (the object)
  const expressionEmitter = getEmitNode(node.expression, option);
  
  // Get the property name
  const propertyName = node.name.getText();
  
  return {
    emit: () => {
      const expression = expressionEmitter.emit();
      
      // For now, implement a simple property access mechanism
      // In a full implementation, we would use proper C structure access
      return `${expression}_${propertyName}`;
    },
    
    getAllVars: () => {
      return expressionEmitter.getAllVars();
    },
  };
};
