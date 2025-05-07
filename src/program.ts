import * as ts from "typescript";
import { AstNode, Emitter } from "./type";
import { getEmitNode, makeDeclareClosure, union } from "./emit/helper";
// import { CallExpression } from "./expression/CallExpression";

export const transpile = (sourceCode: string): string => {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    sourceCode,
    ts.ScriptTarget.ES5,
    true,
  );
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName, target) => sourceFile,
    writeFile: (name, text, writeByteOrderMark) => {},
    getDefaultLibFileName: () => {
      return "lib.d.ts";
    },
    useCaseSensitiveFileNames: () => {
      return false;
    },
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    getNewLine: () => "\n",
    fileExists: (fileName) => fileName === "source.ts",
    readFile: (fileName) => (fileName == "source.ts" ? sourceCode : undefined),
    directoryExists: (dirName) => dirName === "",
  };
  const tsProgram = ts.createProgram(
    ["source.ts"],
    { noLib: true },
    compilerHost,
  );
  const checker = tsProgram.getTypeChecker();

  const programEmit = programEmitter(tsProgram, {
    checker,
    envRecord: {
      children: [],
      name: "global",
      allVars: new Set(),
      boundVars: new Set(),
    },
    fns: [],
  });
  return programEmit?.emit() ?? "";
};

export const programEmitter: Emitter<ts.Program> = (tsProgram, option) => {
  const statementEmitNodes: AstNode[] = [];

  const sources = tsProgram
    .getSourceFiles()
    .filter((s) => !s.isDeclarationFile);

  for (let source of sources) {
    for (let s of source.statements) {
      try {
        statementEmitNodes.push(getEmitNode(s, option));
      } catch (e) {
        console.log(e);
      }
    }
  }

  return {
    emit: () => {
      const statementString = statementEmitNodes
        .map((s) => s.emit())
        .join("\n");
      // Use a simplified approach with global variables
      // Collect all unique variable names used in the program
      const allVars = new Set<string>();
      
      // Recursively scan the source files for all variables
      const collectVariables = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node)) {
          if (ts.isIdentifier(node.name)) {
            // Add the variable to our set of all variables
            allVars.add(node.name.getText());
          }
        }
        ts.forEachChild(node, collectVariables);
      };
      
      // Scan all source files
      tsProgram.getSourceFiles()
        .filter(s => !s.isDeclarationFile)
        .forEach(source => {
          ts.forEachChild(source, collectVariables);
        });
        
      // Track variable types for function pointers
      const varTypes = new Map<string, string>();
      
      // Scan the source files for function expressions assigned to variables
      const collectFunctionTypes = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && 
            ts.isIdentifier(node.name) && 
            node.initializer && 
            ts.isFunctionExpression(node.initializer)) {
          // The variable is assigned a function expression
          const varName = node.name.getText();
          // Get parameter types from the function expression
          const params = node.initializer.parameters.map(p => {
            const typeNode = p.type;
            return typeNode ? (typeNode.getText() === 'number' ? 'int' : 'int') : 'int';
          });
          // For now, we're assuming all functions return int
          varTypes.set(varName, `int (*${varName})(${params.join(', ')})`);
        }
        ts.forEachChild(node, collectFunctionTypes);
      };
      
      // Scan all source files for function types
      tsProgram.getSourceFiles()
        .filter(s => !s.isDeclarationFile)
        .forEach(source => {
          ts.forEachChild(source, collectFunctionTypes);
        });
        
      // Generate global declarations for all variables
      const globalDeclarations = Array.from(allVars).map(varName => {
        // Use the appropriate type for function pointers
        if (varTypes.has(varName)) {
          return `${varTypes.get(varName)} = NULL;`;
        }
        // Default to int for regular variables
        return `int ${varName} = 0;`;
      }).join("\n");
      
      return `
#include <stdio.h>

// Global variables for closure support
${globalDeclarations}

${option.fns.map((f) => f.declare).join("\n")}

${option.fns.map((f) => f.implementation).join("\n\n")}
    
int main(void) {
    ${statementString}
    return 0;
}
`;
    },

    getAllVars: () => union(...statementEmitNodes.map((en) => en.getAllVars())),
  };
};
