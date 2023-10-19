import ts from "typescript";
import { Emitter } from "../../type";
import { getEmitNode } from "../helper";

export const expressionStatement: Emitter<ts.ExpressionStatement> = (
  node,
  option,
) => getEmitNode(node.expression, option);
