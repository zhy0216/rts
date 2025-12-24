import { AstNode, Emitter } from '../../type';
import ts, { TypeFlags, SyntaxKind } from 'typescript';
import { getEmitNode, tsType2C, union } from '../helper';

export const variableStatement: Emitter<ts.VariableStatement> = (
  variableSTNode,
  option
) => {
  const { envRecord, checker } = option;
  const initEmitters: Record<string, AstNode | undefined> = {};
  const declarationStrings: string[] = [];
  const s = new Set<ts.Identifier>();

  // Check if we're inside a function (not at global scope)
  // Global scope has name 'global', function scopes have different names
  // Also check if we're inside a block within global scope (for shadowing)
  const isInsideFunction = envRecord.name !== 'global';

  // Check if this variable statement is at the top level of a source file
  // by checking if its parent is a SourceFile
  const isTopLevelDeclaration = ts.isSourceFile(variableSTNode.parent);

  variableSTNode.declarationList.declarations.forEach((node) => {
    // Process initializers
    if (node.initializer) {
      initEmitters[node.name.getText()] = getEmitNode(node.initializer, option);
    }

    if (ts.isIdentifier(node.name)) {
      s.add(node.name);

      // Get the variable name
      const varName = node.name.getText();

      // Get the variable type
      const varType = tsType2C(checker.getTypeAtLocation(node)) || 'int';

      // Get initializer if any
      const initializer = initEmitters[varName];
      const initString = initializer?.emit();

      // Detect different initializer types
      const isFunctionExpr =
        node.initializer &&
        node.initializer.kind === SyntaxKind.FunctionExpression;
      const isArrayLiteral =
        node.initializer &&
        node.initializer.kind === SyntaxKind.ArrayLiteralExpression;
      const isObjectLiteral =
        node.initializer &&
        node.initializer.kind === SyntaxKind.ObjectLiteralExpression;

      // Track object bindings for property access resolution
      if (
        isObjectLiteral &&
        initializer &&
        typeof (initializer as any).getObjectId === 'function'
      ) {
        if (!option.objectBindings) {
          option.objectBindings = new Map();
        }
        option.objectBindings.set(varName, (initializer as any).getObjectId());
      }

      // Check if this variable is captured by a nested function (should be stored in closure)
      const isCapturedVar = option.capturedVars?.has(varName) ?? false;
      const closureCtxName = option.closureCtxName;

      // Emit local variable declarations for:
      // 1. Variables inside functions
      // 2. Variables in blocks that are not top-level declarations (e.g., shadowed variables in blocks)
      const shouldEmitDeclaration = isInsideFunction || !isTopLevelDeclaration;

      if (isCapturedVar && closureCtxName) {
        // Variable is captured by nested function - store in closure struct
        if (initString) {
          declarationStrings.push(
            `${closureCtxName}->${varName} = ${initString};\n`
          );
        } else {
          declarationStrings.push(`${closureCtxName}->${varName} = 0;\n`);
        }
      } else if (shouldEmitDeclaration) {
        // Emit actual C local variable declarations
        if (
          isFunctionExpr &&
          typeof (initializer as any).getFunctionType === 'function'
        ) {
          // For function expressions, declare as function pointer and assign
          const fnType = (initializer as any).getFunctionType();
          declarationStrings.push(`${fnType} ${varName} = &${initString};\n`);
        } else if (isArrayLiteral) {
          // For array literals, store the pointer to the array
          declarationStrings.push(`int* ${varName} = ${initString};\n`);
        } else if (isObjectLiteral) {
          // For object literals, use void* type
          declarationStrings.push(`void* ${varName} = ${initString};\n`);
        } else if (initString) {
          // Regular variable with initializer
          declarationStrings.push(`${varType} ${varName} = ${initString};\n`);
        } else {
          // Variable without initializer
          declarationStrings.push(`${varType} ${varName} = 0;\n`);
        }
      } else {
        // At top-level global scope: only emit assignment (declaration is done in program.ts)
        if (initString && initializer) {
          if (
            isFunctionExpr &&
            typeof (initializer as any).getFunctionType === 'function'
          ) {
            declarationStrings.push(`${varName} = &${initString};\n`);
          } else if (isArrayLiteral) {
            declarationStrings.push(`int* ${varName} = ${initString};\n`);
          } else {
            declarationStrings.push(`${varName} = ${initString};\n`);
          }
        }
      }
    }
  });

  return {
    emit: () => declarationStrings.join(''),
    getAllVars: () =>
      union(s, ...Object.values(initEmitters).map((en) => en?.getAllVars())),
  };
};
