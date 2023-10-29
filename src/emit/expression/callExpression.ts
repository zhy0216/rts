import { Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode, getFunctionName } from "../helper";

export const callExpressionEmitter: Emitter<ts.CallExpression> = (
  node,
  option,
) => {
  const { checker } = option;
  return {
    emit: () => {
      // TODO: move this to std
      if (node.expression.getText() == "console.log") {
        const argument = node.arguments[0];
        const type = checker.getTypeAtLocation(argument);
        const emitStrings: string[] = [];
        if (type.isStringLiteral()) {
          emitStrings.push(`printf("\\"%s\\"\\n", ${argument.getText()})`);
        }

        if (type.getFlags() & TypeFlags.NumberLike) {
          // TODO: consider number is int first
          emitStrings.push(
            `printf("%d\\n", ${getEmitNode(argument, option).emit()})`,
          );
        }

        if (type.getFlags() & TypeFlags.BooleanLike) {
          emitStrings.push(
            `printf("%s\\n", ${getEmitNode(
              argument,
              option,
            ).emit()}?"true": "false")`,
          );
        }

        return emitStrings.join(";\n");
      }

      if (ts.isIdentifier(node.expression)) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (!symbol) {
          // something wrong
          return "";
        }
        const fnDeclare = symbol.getDeclarations()?.[0];
        const fnName = fnDeclare
          ? getFunctionName(fnDeclare as ts.FunctionDeclaration, option)
          : "";
        const args = node.arguments
          .map((argNode) => getEmitNode(argNode, option).emit())
          .join(",");

        return `${fnName}(${args})`;
      }

      return ``;
    },

    getVariables: () => {
      // node.expression
      return new Set();
    },
  };
};
