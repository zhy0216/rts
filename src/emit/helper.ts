import { Emitter } from "../type";
import * as ts from "typescript";
import { emptyStatementEmitter } from "./statement/emptyStatement";
import { callExpressionEmitter } from "./expression/callExpression";
import { expressionStatement } from "./statement/expressionStatement";

const nodeToEmitter: Record<string, Emitter<any>> = {
  [ts.SyntaxKind.EmptyStatement]: emptyStatementEmitter,
  [ts.SyntaxKind.CallExpression]: callExpressionEmitter,
  [ts.SyntaxKind.ExpressionStatement]: expressionStatement,
};

export const getEmitNode: Emitter = (s, option) => {
  if (s.kind in nodeToEmitter) {
    return nodeToEmitter[s.kind](s, option);
  } else {
    console.log("not support:", s.getText());
  }
};
