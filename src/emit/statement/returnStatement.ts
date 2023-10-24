import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper.ts";

export const returnStatementEmitter: Emitter<ts.ReturnStatement> = (
  node,
  option,
) => {
  return {
    emit: () =>
      "return " +
      (node.expression ? getEmitNode(node.expression, option).emit() : "null") +
      ";",
  };
};
