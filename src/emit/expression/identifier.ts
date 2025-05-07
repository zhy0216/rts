import { Emitter } from "../../type";
import ts from "typescript";

export const identifierEmitter: Emitter<ts.Identifier> = (node, option) => {
  // Check if we are in a catch block and this is the catch variable
  const isCatchVariable = option.catchVariable === node.getText();
  
  return {
    emit: () => {
      // Use the special catch variable if applicable
      return node.getText();
    },
    getAllVars: () => {
      // If this is a catch variable, don't add it to the all variables list
      // because it's a special local variable created by the try-catch mechanism
      return isCatchVariable ? new Set<ts.Identifier>() : new Set<ts.Identifier>([node]);
    },
  };
};
