import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

export const blockEmitter: Emitter<ts.Block> = (node, option) => {
  // Analyze the block to find shadowed variables that need backup/restore
  const variableShadows = new Map<string, boolean>();
  
  // First detect all variable declarations in this block
  node.statements.forEach(statement => {
    if (ts.isVariableStatement(statement)) {
      statement.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          variableShadows.set(decl.name.getText(), true);
        }
      });
    }
  });
  
  // Now get the emit nodes for all statements
  const emitNodes = node.statements.map((s) => getEmitNode(s, option));
  
  return {
    emit: () => {
      // Create backup variables for any shadowed variables
      let blockStart = "";
      let blockEnd = "";
      
      if (variableShadows.size > 0) {
        const backups: string[] = [];
        const restores: string[] = [];
        
        variableShadows.forEach((_, varName) => {
          const backupVarName = `${varName}_backup`;
          backups.push(`int ${backupVarName} = ${varName};`);
          restores.push(`${varName} = ${backupVarName};`);
        });
        
        blockStart = backups.join("\n") + "\n";
        blockEnd = "\n" + restores.join("\n");
      }
      
      // Generate the block body with backup/restore logic added
      return `{\n${blockStart} ${emitNodes.map((en) => en.emit()).join("\n")}${blockEnd}\n}`;
    },

    getAllVars: () => union(...emitNodes.map((en) => en.getAllVars())),
  };
};
