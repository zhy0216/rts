import { Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";

export const callExpressionEmitter: Emitter<ts.CallExpression> = (
  node,
  { checker },
) => {
  return {
    emit: () => {
      if (!ts.isPropertyAccessExpression(node.expression)) {
        throw new Error(`wrong call node: ${node}`);
      }
      if (node.expression.getText() == "console.log") {
        const argument = node.arguments[0];
        const type = checker.getTypeAtLocation(argument);

        return `
${type.isStringLiteral() ? `printf("\\"%s\\"\\n", ${argument.getText()});` : ""}
${type.isNumberLiteral() ? `printf("${argument.getText()}\\n");` : ""}
${
  type.getFlags() & TypeFlags.BooleanLiteral
    ? `printf("${argument.getText()}\\n");`
    : ""
}
`;
      }

      return ``;
    },
  };
};
