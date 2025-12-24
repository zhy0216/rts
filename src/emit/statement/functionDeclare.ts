import { Emitter } from '../../type';
import ts from 'typescript';
import {
  connectChildEnvRecord,
  diff,
  getEmitNode,
  getFunctionName,
  tsType2C,
  union,
} from '../helper.ts';

// Helper to check if a function has nested functions that capture variables
const hasNestedFunctionsWithCaptures = (
  node: ts.FunctionDeclaration | ts.FunctionExpression
): boolean => {
  let hasNested = false;
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) {
      hasNested = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  if (node.body) {
    ts.forEachChild(node.body, visit);
  }
  return hasNested;
};

// Helper to collect variables that are captured by nested functions
const collectCapturedVarsForNestedFunctions = (
  node: ts.FunctionDeclaration | ts.FunctionExpression,
  boundVarNames: Set<string>
): Set<string> => {
  const capturedVars = new Set<string>();

  const visitNestedFunction = (
    fn: ts.FunctionDeclaration | ts.FunctionExpression
  ) => {
    // Collect all identifiers used in the nested function
    const collectIdentifiers = (n: ts.Node) => {
      if (ts.isIdentifier(n)) {
        const varName = n.getText();
        // Check if this identifier is from the outer scope (not a local or parameter of the nested function)
        const isLocalToNested = fn.body?.statements.some((stmt) => {
          if (ts.isVariableStatement(stmt)) {
            return stmt.declarationList.declarations.some(
              (decl) =>
                ts.isIdentifier(decl.name) && decl.name.getText() === varName
            );
          }
          return false;
        });
        const isParamOfNested = fn.parameters.some(
          (p) => ts.isIdentifier(p.name) && p.name.getText() === varName
        );

        if (
          !isLocalToNested &&
          !isParamOfNested &&
          boundVarNames.has(varName)
        ) {
          capturedVars.add(varName);
        }
      }
      ts.forEachChild(n, collectIdentifiers);
    };

    if (fn.body) {
      collectIdentifiers(fn.body);
    }
  };

  // Find all nested functions and collect their captured variables
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) {
      visitNestedFunction(n);
      return; // Don't recurse into nested functions
    }
    ts.forEachChild(n, visit);
  };

  if (node.body) {
    ts.forEachChild(node.body, visit);
  }

  return capturedVars;
};

export const functionDeclareEmitter: Emitter<
  ts.FunctionDeclaration | ts.FunctionExpression
> = (node, option) => {
  const { checker, fns, envRecord } = option;

  const functionName = getFunctionName(node, option);
  const functionType = checker.getTypeAtLocation(node);
  const signature = checker.getSignaturesOfType(
    functionType,
    ts.SignatureKind.Call
  )[0];

  // Check if this is a nested function (parent is not global)
  const isNestedFunction = envRecord.name !== 'global';
  const closureCtxName = isNestedFunction ? 'closure_ctx' : undefined;
  const closureStructName = isNestedFunction
    ? `${envRecord.name}_closure`
    : undefined;

  // Build the parameter string from function parameters
  let parameterList = node.parameters.map((p) => {
    const pType = tsType2C(checker.getTypeAtLocation(p));
    return `${pType} ${p.name.getText()}`;
  });

  // Add closure context parameter for nested functions
  if (isNestedFunction && closureStructName) {
    parameterList.unshift(`struct ${closureStructName}* ${closureCtxName}`);
  }

  const parameterString = parameterList.join(', ');
  const returnType = checker.getReturnTypeOfSignature(signature);

  // Collect bound variables (local declarations + parameters)
  const boundVarIdentifiers = new Set<ts.Identifier>(
    node.body?.statements
      .filter(ts.isVariableStatement)
      .flatMap((n) =>
        n.declarationList.declarations
          .map((d) => d.name)
          .filter(ts.isIdentifier)
      )
  );

  // Add parameters to bound vars
  node.parameters.forEach((p) => {
    if (ts.isIdentifier(p.name)) {
      boundVarIdentifiers.add(p.name);
    }
  });

  // Get bound variable names as strings
  const boundVarNames = new Set<string>();
  boundVarIdentifiers.forEach((id) => boundVarNames.add(id.getText()));

  // Check if this function has nested functions that capture variables
  const hasNestedCaptures = hasNestedFunctionsWithCaptures(node);
  const varsNeededByClosure = hasNestedCaptures
    ? collectCapturedVarsForNestedFunctions(node, boundVarNames)
    : new Set<string>();

  const functionEnvRecord = connectChildEnvRecord(envRecord, {
    closureName: functionName + '_closure',
    children: [],
    name: functionName,
    boundVars: boundVarIdentifiers,
    parent: envRecord,
    allVars: new Set(),
  });

  // First pass: collect all variables used in the body to determine captured vars
  const tempBodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: functionEnvRecord,
      })
    : undefined;

  functionEnvRecord.allVars = union(tempBodyNode?.getAllVars());

  // Calculate captured variables (variables used but not declared locally or as parameters)
  const capturedVars = new Set<string>();
  if (isNestedFunction) {
    functionEnvRecord.allVars.forEach((varId) => {
      const varName = varId.getText();
      if (!boundVarNames.has(varName)) {
        capturedVars.add(varName);
      }
    });
  }

  // Determine which variables should be accessed via closure context
  // For nested functions: variables captured from parent scope
  // For outer functions with nested children: variables that children capture
  const varsToAccessViaClosure = isNestedFunction
    ? capturedVars
    : varsNeededByClosure;
  const ctxNameForBody =
    varsToAccessViaClosure.size > 0
      ? isNestedFunction
        ? closureCtxName
        : 'closure_ctx'
      : undefined;

  // Second pass: emit body with captured vars info
  const bodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: functionEnvRecord,
        capturedVars:
          varsToAccessViaClosure.size > 0 ? varsToAccessViaClosure : undefined,
        closureCtxName: ctxNameForBody,
      })
    : undefined;

  const getAllVars = () => union(bodyNode?.getAllVars());

  return {
    emit: () => {
      // Get the original body
      let bodyString = bodyNode?.emit() ?? '';

      // If this function has nested functions that capture variables,
      // we need to create a closure struct at the beginning of the function
      if (varsNeededByClosure.size > 0 && !isNestedFunction) {
        const closureName = functionName + '_closure';
        // Insert closure struct setup at the beginning of the function body
        // The body is wrapped in { }, so we insert after the opening brace
        const closureSetup = `struct ${closureName} __closure_data; struct ${closureName}* closure_ctx = &__closure_data;\n`;
        bodyString = bodyString.replace(/^\{\n/, `{\n${closureSetup}`);
      }

      // Generate the function declaration string
      const declareString = `${tsType2C(
        returnType
      )} ${functionName}(${parameterString})`;

      fns.push({
        declare: declareString + ';',
        implementation: `${declareString} ${bodyString};`,
      });

      return '';
    },
    getAllVars,
  };
};
