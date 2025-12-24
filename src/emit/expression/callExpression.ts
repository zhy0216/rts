import { Emitter } from '../../type';
import ts, { TypeFlags } from 'typescript';
import { getEmitNode, getFunctionName, union } from '../helper';

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
          // Handle string concatenation
          if (
            argument.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            (ts.isStringLiteral(argument.left) ||
              ts.isStringLiteral(argument.right))
          ) {
            // String concatenation case
            const leftEmitter = getEmitNode(argument.left, option);
            const rightEmitter = getEmitNode(argument.right, option);

            // If left is a string literal and right is a variable or number
            if (ts.isStringLiteral(argument.left)) {
              const leftText = argument.left.getText().replace(/"/g, '');
              const rightValue = rightEmitter.emit();

              emitStrings.push(`printf("${leftText}%d\\n", ${rightValue})`);
            } else {
              // Right is a string literal
              const leftValue = leftEmitter.emit();
              const rightText = argument.right.getText().replace(/"/g, '');

              emitStrings.push(`printf("%d${rightText}\\n", ${leftValue})`);
            }
          } else {
            // Handle other binary operations (arithmetic, comparison, etc.)
            // Generate code for the binary expression and print it
            const exprEmitter = getEmitNode(argument, option);

            // Check if it's a boolean comparison
            if (
              [
                ts.SyntaxKind.EqualsEqualsEqualsToken,
                ts.SyntaxKind.ExclamationEqualsEqualsToken,
                ts.SyntaxKind.LessThanToken,
                ts.SyntaxKind.GreaterThanToken,
              ].includes(argument.operatorToken.kind)
            ) {
              // Boolean comparison
              emitStrings.push(
                `printf("%s\\n", ${exprEmitter.emit()} ? "true" : "false")`
              );
            } else {
              // Arithmetic operation
              emitStrings.push(`printf("%d\\n", ${exprEmitter.emit()})`);
            }
          }
        } else {
          // Handle simple cases (literals and identifiers)
          if (type.isStringLiteral()) {
            emitStrings.push(
              `printf("\\"${argument.getText().replace(/"/g, '')}\\"\\n")`
            );
          } else if (type.getFlags() & TypeFlags.NumberLike) {
            // Number type
            emitStrings.push(
              `printf("%d\\n", ${getEmitNode(argument, option).emit()})`
            );
          } else if (type.getFlags() & TypeFlags.BooleanLike) {
            // Boolean type
            emitStrings.push(
              `printf("%s\\n", ${getEmitNode(argument, option).emit()} ? "true" : "false")`
            );
          } else {
            // Default case - try to print as a number
            emitStrings.push(
              `printf("%d\\n", ${getEmitNode(argument, option).emit()})`
            );
          }
        }

        return emitStrings.join(';\n');
      }

      if (ts.isIdentifier(node.expression)) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (!symbol) {
          // something wrong
          return '';
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

      return ``;
    },

    getAllVars: () => {
      return union(...argsEmitNodes.map((node) => node.getAllVars()));
    },
  };
};
