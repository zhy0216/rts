import { Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode } from "../helper";

export const callExpressionEmitter: Emitter<ts.CallExpression> = (
  node,
  option,
) => {
  const { checker } = option;
  return {
    emit: () => {
      if (!ts.isPropertyAccessExpression(node.expression)) {
        throw new Error(`wrong call node: ${node}`);
      }
      if (node.expression.getText() == "console.log") {
        const argument = node.arguments[0];
        const type = checker.getTypeAtLocation(argument);
        const emitStrings: string[] = [];
        if (type.isStringLiteral()) {
          emitStrings.push(`printf("\\"%s\\"\\n", ${argument.getText()});`);
        }

        if (type.getFlags() & TypeFlags.NumberLike) {
          // TODO: consider number is int first
          emitStrings.push(
            `printf("%d\\n", ${getEmitNode(argument, option).emit()});`,
          );
        }

        if (type.getFlags() & TypeFlags.BooleanLike) {
          emitStrings.push(
            `printf("%s\\n", ${getEmitNode(
              argument,
              option,
            ).emit()}?"true": "false");`,
          );
        }

        return emitStrings.join("\n");
      }

      return ``;
    },
  };
};
