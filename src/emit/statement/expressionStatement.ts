import ts from "typescript";
import { Emitter } from "../../type";
import { getEmitNode } from "../helper";

export const expressionStatement: Emitter<ts.ExpressionStatement> = (
  node,
  option,
) => {
  const string = getEmitNode(node.expression, option).emit();
  return {
    emit: () => string + ";",
  };
};
