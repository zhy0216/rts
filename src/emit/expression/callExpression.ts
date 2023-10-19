import { Emitter } from "../../type";
import ts from "typescript";

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
${type.isLiteral() && `printf("${argument.getText()}");`}        
`;
      }

      return `not support call expression ${node}`;
    },
  };
};
