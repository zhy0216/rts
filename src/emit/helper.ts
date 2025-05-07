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
import { whileStatementEmitter } from "./statement/whileStatement.ts";
import { forStatementEmitter } from "./statement/forStatement.ts";
import { continueStatementEmitter } from "./statement/continueStatement.ts";
import { breakStatementEmitter } from "./statement/breakStatement.ts";
import { conditionalExpressionEmitter } from "./expression/conditionalExpression.ts";
import { unaryExpressionEmitter } from "./expression/unaryExpression.ts";
import { functionExpressionEmitter } from "./expression/functionExpression.ts";
import { ImportClause, SyntaxKind, TypeFlags } from "typescript";

const nodeToEmitter: Record<string, Emitter<any>> = {
  [ts.SyntaxKind.EmptyStatement]: emptyStatementEmitter,
  [ts.SyntaxKind.CallExpression]: callExpressionEmitter,
  [ts.SyntaxKind.ExpressionStatement]: expressionStatement,
  [ts.SyntaxKind.VariableStatement]: variableStatement,
  [ts.SyntaxKind.NumericLiteral]: literalEmitter,
  [ts.SyntaxKind.StringLiteral]: literalEmitter,
  [ts.SyntaxKind.TrueKeyword]: literalEmitter,
  [ts.SyntaxKind.FalseKeyword]: literalEmitter,
  [ts.SyntaxKind.NullKeyword]: literalEmitter,
  [ts.SyntaxKind.Identifier]: identifierEmitter,
  [ts.SyntaxKind.Block]: blockEmitter,
  [ts.SyntaxKind.BinaryExpression]: binaryExpressionEmitter,
  [ts.SyntaxKind.ConditionalExpression]: conditionalExpressionEmitter,
  [ts.SyntaxKind.PrefixUnaryExpression]: unaryExpressionEmitter,
  [ts.SyntaxKind.PostfixUnaryExpression]: unaryExpressionEmitter,
  [ts.SyntaxKind.IfStatement]: ifStatementEmitter,
  [ts.SyntaxKind.WhileStatement]: whileStatementEmitter,
  [ts.SyntaxKind.ForStatement]: forStatementEmitter,
  [ts.SyntaxKind.ContinueStatement]: continueStatementEmitter,
  [ts.SyntaxKind.BreakStatement]: breakStatementEmitter,
  [ts.SyntaxKind.FunctionDeclaration]: functionDeclareEmitter,
  [ts.SyntaxKind.FunctionExpression]: functionExpressionEmitter,
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
  const closureVars = diff(
    functionEnvRecord.allVars,
    functionEnvRecord.boundVars,
  );

  return union(closureVars, ...functionEnvRecord.children.map(allClosureVars));
};

const structClosure = (
  functionEnvRecord: EnvRecord,
  { checker }: EmitterOption,
): string => {
  const closureVars = allClosureVars(functionEnvRecord);
  const declareVarStrings: Record<string, string> = {};
  closureVars.forEach((tempVar) => {
    const symbol = checker.getSymbolAtLocation(tempVar);
    if (!symbol) {
      return;
    }
    const declareVar = symbol.getDeclarations()?.[0];

    // Changed condition to include all variables from outer scopes
    if (declareVar && ts.isVariableDeclaration(declareVar)) {
      const varName = declareVar.name.getText();
      const typeNode = checker.getTypeAtLocation(declareVar);
      declareVarStrings[varName] = `${tsType2C(typeNode)} ${varName};`;
    }
  });
  
  const declareString = Object.values(declareVarStrings).join("\n");

  return `struct ${functionEnvRecord.closureName} {\n${declareString}\n};`;
};

/** end EnvRecord */

// Create a map to keep track of variable name mappings for different scopes
// This helps with handling shadowed variables across different scopes
export const variableMap = new Map<string, string>();

// Create a counter for generating unique variable names to handle shadowing
let shadowCounter = 0;

// Function to get a new unique shadow counter value
export const getNextShadowCounter = () => shadowCounter++;
