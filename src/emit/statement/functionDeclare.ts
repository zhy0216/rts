import { Emitter, EmitterOption } from '../../type';
import ts from 'typescript';
import {
  connectChildEnvRecord,
  diff,
  getEmitNode,
  getFunctionName,
  tsType2CStrict,
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

// True if this function lets one of its own nested functions escape, i.e. it
// `return`s an identifier that resolves to a nested function declaration / a
// local bound to a nested function expression. An escaping closure's context
// must outlive the defining function's stack frame, so it is heap-allocated
// (malloc) rather than stack-allocated. (Theme 4c)
const returnsANestedClosure = (
  node: ts.FunctionDeclaration | ts.FunctionExpression
): boolean => {
  if (!node.body) {
    return false;
  }
  // Names declared directly inside this function that denote a nested function:
  // function declarations and locals initialised with a function expression.
  // Returning any of these lets a closure escape.
  const nestedFnNames = new Set<string>();
  const collectNested = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n)) {
      if (n.name) {
        nestedFnNames.add(n.name.getText());
      }
      return; // do not descend into the nested function's own body
    }
    if (ts.isFunctionExpression(n)) {
      return;
    }
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      ts.isFunctionExpression(n.initializer)
    ) {
      nestedFnNames.add(n.name.getText());
    }
    ts.forEachChild(n, collectNested);
  };
  ts.forEachChild(node.body, collectNested);

  let escapes = false;
  const visitReturns = (n: ts.Node) => {
    // Do not descend into nested functions: their returns belong to them.
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) {
      return;
    }
    if (
      ts.isReturnStatement(n) &&
      n.expression &&
      ts.isIdentifier(n.expression) &&
      nestedFnNames.has(n.expression.getText())
    ) {
      escapes = true;
    }
    ts.forEachChild(n, visitReturns);
  };
  ts.forEachChild(node.body, visitReturns);
  return escapes;
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

// Shared emitter core for both function declarations and function expressions.
// Theme 4: capture analysis, the closure-context setup, and the nested-function
// plumbing live in ONE place so `function f(){}` and `const f = function(){}`
// capture identically. The only difference between the two surface forms is the
// `emitName` flag: a function-expression value returns its generated C name (so
// the caller can bind it as a function pointer) and exposes its function-pointer
// C type via getFunctionType().
export const emitFunctionLike = (
  node: ts.FunctionDeclaration | ts.FunctionExpression,
  option: EmitterOption,
  emitName: boolean
) => {
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
    const pType = tsType2CStrict(checker.getTypeAtLocation(p));
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

  // First pass: collect all variables used in the body to determine captured
  // vars. This is analysis-only, so it MUST NOT contribute to the real `fns`
  // list: some emitters (e.g. variableStatement) emit their initializer at
  // CONSTRUCTION time, and a nested function expression's emit pushes to `fns` —
  // running the analysis pass against the shared list would register that nested
  // function twice (C "redefinition"). Give this pass a throwaway `fns` so any
  // such side effects are discarded; only the second pass uses the real list.
  const tempBodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        fns: [],
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

  // An outer function that owns a closure lets it escape when it returns one of
  // its nested functions; in that case the closure context must outlive this
  // stack frame, so it is heap-allocated (malloc) instead of stack-allocated.
  const escapes =
    varsNeededByClosure.size > 0 &&
    !isNestedFunction &&
    returnsANestedClosure(node);

  // C type of this function value, used both for the function-pointer declarator
  // (function-expression assignment) and exposed via getFunctionType(). Build it
  // from `parameterList` (NOT node.parameters) so a nested capturing function
  // expression's pointer type includes the leading `struct …_closure*` context
  // parameter — otherwise the declarator (`void (*inner)()`) would not match the
  // C function (`void __func_x(struct …_closure*)`) and the call would read a
  // garbage context. We keep only the C TYPE of each parameter (drop the name).
  const paramTypesForPointer = parameterList.map((p) => {
    // Each entry is "<type tokens> <name>"; strip the trailing identifier.
    const trimmed = p.trim();
    const lastSpace = trimmed.lastIndexOf(' ');
    return lastSpace === -1 ? trimmed : trimmed.slice(0, lastSpace);
  });
  const functionTypeStr = `${tsType2CStrict(returnType)} (*)(${paramTypesForPointer.join(
    ', '
  )})`;

  // The closure-context setup, prepended into the body as a REAL first statement
  // (Theme 4a) via the block emitter's prepend hook — no regex surgery on the
  // rendered body string. Non-escaping closures stay on the stack (cheap, and
  // matches the prior emitted output); escaping closures malloc so the returned
  // function's context outlives this frame (Theme 4c).
  const closureSetupStatements: string[] = [];
  if (varsNeededByClosure.size > 0 && !isNestedFunction) {
    const closureName = functionName + '_closure';
    closureSetupStatements.push(
      escapes
        ? `struct ${closureName}* closure_ctx = malloc(sizeof(struct ${closureName}));`
        : `struct ${closureName} __closure_data; struct ${closureName}* closure_ctx = &__closure_data;`
    );
  }

  // Second pass: emit body with captured-vars info AND the structured closure
  // setup prepended into the block (no string surgery — Theme 4a). This is the
  // pass that actually contributes the function's `fns` entry.
  const bodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: functionEnvRecord,
        capturedVars:
          varsToAccessViaClosure.size > 0 ? varsToAccessViaClosure : undefined,
        closureCtxName: ctxNameForBody,
        prependStatements:
          closureSetupStatements.length > 0
            ? closureSetupStatements
            : undefined,
      })
    : undefined;

  const getAllVars = () => union(bodyNode?.getAllVars());

  return {
    emit: () => {
      const bodyString = bodyNode?.emit() ?? '{\n}';

      // Generate the function declaration string
      const declareString = `${tsType2CStrict(
        returnType
      )} ${functionName}(${parameterString})`;

      fns.push({
        declare: declareString + ';',
        implementation: `${declareString} ${bodyString};`,
      });

      // A function declaration contributes no inline text; a function
      // expression value emits its C function name so the caller (variable
      // declaration / assignment) can bind it as a function pointer.
      return emitName ? functionName : '';
    },
    getAllVars,
    // Function-pointer C type, consumed by variableStatement.ts to declare the
    // holding variable (e.g. `double (*f)(double)`).
    getFunctionType: () => functionTypeStr,
  };
};

export const functionDeclareEmitter: Emitter<
  ts.FunctionDeclaration | ts.FunctionExpression
> = (node, option) => emitFunctionLike(node, option, false);
