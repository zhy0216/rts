import { Emitter } from "../type";
import * as ts from "typescript";
import { emptyStatementEmitter } from "./statement/emptyStatement";

const nodeToEmitter: Record<string, Emitter> = {
  [ts.SyntaxKind.EmptyStatement]: emptyStatementEmitter,
  // [ts.SyntaxKind.CallExpression]: (node, option) =>
  //   new CallExpression(node as ts.CallExpression, option),
};

export const getEmitNode: Emitter = (s, option) => {
  if (s.kind in nodeToEmitter) {
    return nodeToEmitter[s.kind](s, option);
  } else {
    console.log("not support:", s.getText());
  }
};
