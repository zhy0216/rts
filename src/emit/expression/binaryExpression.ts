import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper.ts";

export const binaryExpressionEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option,
) => ({
  emit: () => {
    const left = getEmitNode(node.left, option).emit();
    const right = getEmitNode(node.right, option).emit();

    return `(${left} ${node.operatorToken.getText()} ${right})`;
  },
});
