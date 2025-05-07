import { AstNode, Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode, union } from "../helper";

export const variableStatement: Emitter<ts.VariableStatement> = (
  variableSTNode,
  option,
) => {
  const { envRecord, checker } = option;
  const initEmitters: Record<string, AstNode | undefined> = {};
  const declarationStrings: string[] = [];
  const s = new Set<ts.Identifier>();
  
  variableSTNode.declarationList.declarations.forEach((node) => {
    // Process initializers
    if (node.initializer) {
      initEmitters[node.name.getText()] = getEmitNode(node.initializer, option);
    }
    
    if (ts.isIdentifier(node.name)) {
      s.add(node.name);
      
      // Get the variable name
      const varName = node.name.getText();
      
      // Get initializer if any
      const initString = initEmitters[varName]?.emit();
      
      // Only emit the initialization as assignment, since declaration is done globally
      if (initString) {
        declarationStrings.push(`${varName} = ${initString};\n`);
      }
    }
  });

  return {
    emit: () => declarationStrings.join(""),
    getAllVars: () =>
      union(s, ...Object.values(initEmitters).map((en) => en?.getAllVars())),
  };
};
