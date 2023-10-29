import ts from "typescript";
import { Emitter } from "../../type";
import { getEmitNode } from "../helper";

export const expressionStatement: Emitter<ts.ExpressionStatement> = (
  node,
  option,
) => {
  const emitNode = getEmitNode(node.expression, option);
  return {
    emit: () => emitNode.emit() + ";",
    getVars: () => emitNode.getVars(),
  };
};
