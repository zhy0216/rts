import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper.ts";

export const returnStatementEmitter: Emitter<ts.ReturnStatement> = (
  node,
  option,
) => {
  const returnEmitNode = node.expression
    ? getEmitNode(node.expression, option)
    : undefined;
  return {
    emit: () =>
      "return " + (returnEmitNode ? returnEmitNode.emit() : "null") + ";",
    getVariables: () => union(returnEmitNode?.getVariables()),
  };
};
