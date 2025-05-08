import { AstNode, Emitter } from "../../type";
import ts, { TypeFlags, SyntaxKind } from "typescript";
import { getEmitNode, tsType2C, union } from "../helper";

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
      const initializer = initEmitters[varName];
      const initString = initializer?.emit();
      
      // Detect different initializer types
      const isFunctionExpr = node.initializer && node.initializer.kind === SyntaxKind.FunctionExpression;
      const isArrayLiteral = node.initializer && node.initializer.kind === SyntaxKind.ArrayLiteralExpression;
      
      // Only emit the initialization as assignment, since declaration is done globally
      if (initString && initializer) {
        if (isFunctionExpr && typeof (initializer as any).getFunctionType === 'function') {
          // For function expressions, just assign the function name directly
          declarationStrings.push(`${varName} = &${initString};\n`);
        } else if (isArrayLiteral) {
          // For array literals, store the pointer to the array
          declarationStrings.push(`int* ${varName} = ${initString};\n`);
        } else {
          declarationStrings.push(`${varName} = ${initString};\n`);
        }
      }
    }
  });

  return {
    emit: () => declarationStrings.join(""),
    getAllVars: () =>
      union(s, ...Object.values(initEmitters).map((en) => en?.getAllVars())),
  };
};
