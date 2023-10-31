import { Emitter, EmitterOption, EnvRecord } from "../type";
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

// from tsc
export function isCompoundAssignment(
  kind: ts.BinaryOperator,
): kind is ts.CompoundAssignmentOperator {
  return (
    kind >= ts.SyntaxKind.FirstCompoundAssignment &&
    kind <= ts.SyntaxKind.LastCompoundAssignment
  );
}

/** start EnvRecord */
export const connectChildEnvRecord = (
  envRecord: EnvRecord,
  childEnv: EnvRecord,
): EnvRecord => {
  envRecord.children.push(childEnv);
  return childEnv;
};

export const makeDeclareClosure = (option: EmitterOption): string => {
  const rootEnvRecord = option.envRecord;
  const declareString = [];
  for (const envRecord of rootEnvRecord.children) {
    if (allClosureVars(envRecord).size > 0) {
      declareString.push(structClosure(envRecord, option));
    }
  }

  return declareString.join("\n");
};

const allClosureVars = (functionEnvRecord: EnvRecord): Set<ts.Identifier> => {
  // console.log("########## functionEnvRecord:", functionEnvRecord);
  const closureVars = functionEnvRecord?.getUnboundVars?.();
  // console.log("########## closureVars:", closureVars?.size);

  return union(closureVars, ...functionEnvRecord.children.map(allClosureVars));
};

const structClosure = (
  functionEnvRecord: EnvRecord,
  { checker }: EmitterOption,
): string => {
  const closureVars = allClosureVars(functionEnvRecord);
  const declareVarStrings: string[] = [];
  closureVars.forEach((tempVar) => {
    console.log(
      "##### functionEnvRecord.children.length:",
      functionEnvRecord.children.length,
    );
    console.log("##### functionEnvRecord.children:");
    allClosureVars(functionEnvRecord.children[0]).forEach((n) =>
      console.log(n.getFullStart()),
    );

    if (functionEnvRecord.getBoundVars().has(tempVar)) {
      const typeNode = checker.getTypeAtLocation(tempVar);
      declareVarStrings.push(`${tsType2C(typeNode)} ${tempVar.getText()};`);
    }
  });
  const declareString = declareVarStrings.join("\n");

  return `struct ${functionEnvRecord.closureName} {${declareString}}`;
};

/** end EnvRecord */
