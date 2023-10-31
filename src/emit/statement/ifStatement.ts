import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper.ts";

export const ifStatementEmitter: Emitter<ts.IfStatement> = (node, option) => {
  const conditionEmitNode = getEmitNode(node.expression, option);
  const thenEmitNode = getEmitNode(node.thenStatement, option);
  const elseEmitNode = node.elseStatement
    ? getEmitNode(node.elseStatement, option)
    : undefined;

  return {
    emit: () => {
      const conditionString = conditionEmitNode.emit();
      const thenString = thenEmitNode.emit();
      const elseString = elseEmitNode ? "else " + elseEmitNode.emit() : "";

      return `if(${conditionString}) ${thenString} ${elseString}`;
    },

    getAllVars: () =>
      union(
        conditionEmitNode.getAllVars(),
        thenEmitNode.getAllVars(),
        elseEmitNode?.getAllVars(),
      ),
  };
};
