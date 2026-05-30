import { Emitter } from '../../type';
import ts, { TypeFlags } from 'typescript';
import {
  classDeclOfType,
  getEmitNode,
  getFunctionName,
  isClassInstanceType,
  union,
} from '../helper';

// True if the expression's static type is string-like (a string literal type or
// the `string` type). Drives %s vs %g in console.log string concatenation.
const isStringLikeArg = (
  node: ts.Expression,
  checker: ts.TypeChecker
): boolean => {
  return (
    (checker.getTypeAtLocation(node).getFlags() & TypeFlags.StringLike) !== 0
  );
};

// Pick the printf-based printer for a console.log argument from its lowered type:
//   number  -> rts_print_number(expr)   (ints clean, floats via %g)
//   string  -> printf("%s\n", expr)     (no surrounding quotes)
//   boolean -> printf("%s\n", expr ? "true" : "false")
// Falls back to the number printer for anything else (numbers dominate the
// current fixtures and lower to a printable double). `arg` (when given) lets us
// recognise expressions whose C value is a string even if the checker's static
// type is not flagged StringLike under the minimal noLib (e.g. `typeof`, which
// always emits a C string literal).
const consolePrint = (
  type: ts.Type,
  expr: string,
  arg?: ts.Expression
): string => {
  const flags = type.getFlags();
  if ((arg && ts.isTypeOfExpression(arg)) || flags & TypeFlags.StringLike) {
    return `printf("%s\\n", ${expr})`;
  }
  if (flags & TypeFlags.BooleanLike) {
    return `printf("%s\\n", ${expr} ? "true" : "false")`;
  }
  return `rts_print_number(${expr})`;
};

export const callExpressionEmitter: Emitter<ts.CallExpression> = (
  node,
  option
) => {
  const { checker } = option;
  const argsEmitNodes = node.arguments.map((tNode) =>
    getEmitNode(tNode, option)
  );
  return {
    emit: () => {
      // TODO: move this to std
      if (node.expression.getText() == 'console.log') {
        const argument = node.arguments[0];
        const type = checker.getTypeAtLocation(argument);
        const emitStrings: string[] = [];

        // Handle different expression types
        if (ts.isBinaryExpression(argument)) {
          // String concatenation: a `+` with at least one string operand. Emit a
          // single printf, using %s for the string part and %g for the numeric
          // part (the fixtures only concatenate small numbers).
          if (
            argument.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            (isStringLikeArg(argument.left, checker) ||
              isStringLikeArg(argument.right, checker))
          ) {
            const leftFmt = isStringLikeArg(argument.left, checker)
              ? '%s'
              : '%g';
            const rightFmt = isStringLikeArg(argument.right, checker)
              ? '%s'
              : '%g';
            const leftValue = getEmitNode(argument.left, option).emit();
            const rightValue = getEmitNode(argument.right, option).emit();

            emitStrings.push(
              `printf("${leftFmt}${rightFmt}\\n", ${leftValue}, ${rightValue})`
            );
          } else {
            // Other binary operations (arithmetic, comparison, etc.)
            const exprEmitter = getEmitNode(argument, option);

            // Comparison operators yield a boolean -> print true/false, not 1/0.
            if (
              [
                ts.SyntaxKind.EqualsEqualsEqualsToken,
                ts.SyntaxKind.ExclamationEqualsEqualsToken,
                ts.SyntaxKind.EqualsEqualsToken,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.SyntaxKind.LessThanToken,
                ts.SyntaxKind.GreaterThanToken,
                ts.SyntaxKind.LessThanEqualsToken,
                ts.SyntaxKind.GreaterThanEqualsToken,
                ts.SyntaxKind.InstanceOfKeyword,
                ts.SyntaxKind.InKeyword,
              ].includes(argument.operatorToken.kind)
            ) {
              emitStrings.push(
                `printf("%s\\n", ${exprEmitter.emit()} ? "true" : "false")`
              );
            } else {
              // Arithmetic / bitwise / assignment expression: its static type
              // drives the printer (number -> rts_print_number, etc.).
              emitStrings.push(consolePrint(type, exprEmitter.emit()));
            }
          }
        } else {
          // Simple cases (literals and identifiers): pick the printer from the
          // operand's static type.
          emitStrings.push(
            consolePrint(type, getEmitNode(argument, option).emit(), argument)
          );
        }

        return emitStrings.join(';\n');
      }

      if (ts.isIdentifier(node.expression)) {
        let symbol = checker.getSymbolAtLocation(node.expression);
        if (!symbol) {
          // something wrong
          return '';
        }
        // An imported name resolves to an alias symbol; follow it to the real
        // declaration so the call uses the same per-file mangled name as the
        // definition (Theme 6).
        if (symbol.flags & ts.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol);
        }

        const fnDeclare = symbol.getDeclarations()?.[0];

        // Check if this is a variable declaration that holds a function expression
        const isFunctionVar =
          fnDeclare &&
          ts.isVariableDeclaration(fnDeclare) &&
          fnDeclare.initializer &&
          ts.isFunctionExpression(fnDeclare.initializer);

        // If this is a variable holding a function expression, call through the function pointer
        if (isFunctionVar) {
          // Get the variable name and use it as a function pointer
          const varName = node.expression.getText();

          // Get arguments
          let argsList = node.arguments.map((argNode) =>
            getEmitNode(argNode, option).emit()
          );

          // A function expression nested inside another function lowers to a C
          // function that takes the closure context as its first parameter
          // (Theme 4: function expressions share the capture machinery). When we
          // call such a closure through its pointer, pass the active closure_ctx
          // so captured-variable access works — exactly as for a nested function
          // declaration call below.
          const feNested =
            fnDeclare.initializer &&
            fnDeclare.initializer.parent &&
            (ts.isFunctionDeclaration(fnDeclare.initializer.parent) ||
              ts.isFunctionExpression(fnDeclare.initializer.parent) ||
              ts.isBlock(fnDeclare.initializer.parent));
          if (feNested && option.closureCtxName) {
            argsList.unshift(option.closureCtxName);
          }

          const args = argsList.join(',');

          // Call through the function pointer
          return `(*${varName})(${args})`;
        }

        // Regular function call
        const fnName = fnDeclare
          ? getFunctionName(fnDeclare as ts.FunctionDeclaration, option)
          : '';

        // Check if the function needs a closure context
        // A nested function is one whose declaration is inside another function
        const needsClosureContext =
          fnDeclare &&
          (ts.isFunctionDeclaration(fnDeclare) ||
            ts.isFunctionExpression(fnDeclare)) &&
          fnDeclare.parent &&
          (ts.isFunctionDeclaration(fnDeclare.parent) ||
            ts.isFunctionExpression(fnDeclare.parent) ||
            ts.isBlock(fnDeclare.parent));

        // Get arguments as they are
        let argsList = node.arguments.map((argNode) =>
          getEmitNode(argNode, option).emit()
        );

        // If we need to pass closure context, pass the existing closure_ctx pointer
        if (needsClosureContext && option.closureCtxName) {
          // Pass the existing closure_ctx as the first argument
          argsList.unshift(option.closureCtxName);
        }

        const args = argsList.join(',');

        return `${fnName}(${args})`;
      }

      // Method call on a class instance: obj.method(args) lowers to the
      // standalone receiver function Cls_<Class>_method(obj, args) (Theme 5).
      if (ts.isPropertyAccessExpression(node.expression)) {
        const receiver = node.expression.expression;
        const classDecl = classDeclOfType(checker.getTypeAtLocation(receiver));
        if (classDecl) {
          const cName = `Cls_${classDecl.name!.getText()}`;
          const methodName = node.expression.name.getText();
          const objStr = getEmitNode(receiver, option).emit();
          const argStrs = node.arguments.map((a) =>
            getEmitNode(a, option).emit()
          );
          return `${cName}_${methodName}(${[objStr, ...argStrs].join(', ')})`;
        }
      }

      return ``;
    },

    getAllVars: () => {
      return union(...argsEmitNodes.map((node) => node.getAllVars()));
    },
  };
};
