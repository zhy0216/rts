import { Emitter, EmitterOption } from "../type";
import * as ts from "typescript";
import { emptyStatementEmitter } from "./statement/emptyStatement";
import { callExpressionEmitter } from "./expression/callExpression";
import { expressionStatement } from "./statement/expressionStatement";
import { variableStatement } from "./statement/variableStatement";
import { literalEmitter } from "./expression/literal";
import { identifierEmitter } from "./expression/identifier";
import { blockEmitter } from "./statement/block";
import { binaryExpressionEmitter } from "./expression/binaryExpression.ts";
import { ifStatementEmitter } from "./statement/ifStatement.ts";
import { functionDeclareEmitter } from "./statement/functionDeclare.ts";
import { returnStatementEmitter } from "./statement/returnStatement.ts";
import { TypeFlags } from "typescript";

const nodeToEmitter: Record<string, Emitter<any>> = {
  [ts.SyntaxKind.EmptyStatement]: emptyStatementEmitter,
  [ts.SyntaxKind.CallExpression]: callExpressionEmitter,
  [ts.SyntaxKind.ExpressionStatement]: expressionStatement,
  [ts.SyntaxKind.VariableStatement]: variableStatement,
  [ts.SyntaxKind.NumericLiteral]: literalEmitter,
  [ts.SyntaxKind.StringLiteral]: literalEmitter,
  [ts.SyntaxKind.TrueKeyword]: literalEmitter,
  [ts.SyntaxKind.FalseKeyword]: literalEmitter,
  [ts.SyntaxKind.Identifier]: identifierEmitter,
  [ts.SyntaxKind.Block]: blockEmitter,
  [ts.SyntaxKind.BinaryExpression]: binaryExpressionEmitter,
  [ts.SyntaxKind.IfStatement]: ifStatementEmitter,
  [ts.SyntaxKind.FunctionDeclaration]: functionDeclareEmitter,
  [ts.SyntaxKind.FunctionExpression]: functionDeclareEmitter,
  [ts.SyntaxKind.ReturnStatement]: returnStatementEmitter,
};

export const getEmitNode: Emitter = (s, option) => {
  if (s.kind in nodeToEmitter) {
    return nodeToEmitter[s.kind](s, option);
  } else {
    throw new Error(`not support: ${s.getText()}`);
  }
};

export const getFunctionName = (
  node: ts.FunctionDeclaration | ts.FunctionExpression,
  option: EmitterOption,
): string => {
  // TODO: consider multiple files? import, export
  const idName = node.name ? node.name.getText() + "_" : "";
  return `__func_${idName}${node.pos}_${node.end}`;
};

export const tsType2C = (node: ts.Type) => {
  if (node.getFlags() & TypeFlags.NumberLike) {
    return "int";
  } else if (node.getFlags() & TypeFlags.StringLike) {
    return "char *";
  } else if (node.getFlags() & TypeFlags.BooleanLike) {
    return "int";
  } else if (node.getFlags() & TypeFlags.Void) {
    return "void";
  }
};

export const union = <T>(...sets: (Set<T> | undefined)[]) => {
  const set = new Set<T>();
  for (const tSet of sets) {
    tSet &&
      tSet.forEach((t) => {
        set.add(t);
      });
  }
  return set;
};

export const diff = <T>(setA: Set<T>, setB: Set<T>) => {
  const set = new Set<T>();
  setA.forEach((ele) => {
    if (!setB.has(ele)) {
      set.add(ele);
    }
  });

  return set;
};

export function isCompoundAssignment(
  kind: ts.BinaryOperator,
): kind is ts.CompoundAssignmentOperator {
  return (
    kind >= ts.SyntaxKind.FirstCompoundAssignment &&
    kind <= ts.SyntaxKind.LastCompoundAssignment
  );
}
