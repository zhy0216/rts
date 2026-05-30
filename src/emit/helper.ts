import { Emitter, EmitterOption, EnvRecord, StructDeclaration } from '../type';
import * as ts from 'typescript';
import { emptyStatementEmitter } from './statement/emptyStatement';
import { callExpressionEmitter } from './expression/callExpression';
import { expressionStatement } from './statement/expressionStatement';
import { variableStatement } from './statement/variableStatement';
import { literalEmitter } from './expression/literal';
import { identifierEmitter } from './expression/identifier';
import { blockEmitter } from './statement/block';
import { binaryExpressionEmitter } from './expression/binaryExpression.ts';
import { ifStatementEmitter } from './statement/ifStatement.ts';
import { functionDeclareEmitter } from './statement/functionDeclare.ts';
import { returnStatementEmitter } from './statement/returnStatement.ts';
import { whileStatementEmitter } from './statement/whileStatement.ts';
import { doWhileStatementEmitter } from './statement/doWhileStatement.ts';
import { forStatementEmitter } from './statement/forStatement.ts';
import { forOfStatementEmitter } from './statement/forOfStatement.ts';
import { forInStatementEmitter } from './statement/forInStatement.ts';
import { continueStatementEmitter } from './statement/continueStatement.ts';
import { breakStatementEmitter } from './statement/breakStatement.ts';
import { switchStatementEmitter } from './statement/switchStatement.ts';
import { throwStatementEmitter } from './statement/throwStatement.ts';
import { tryStatementEmitter } from './statement/tryStatement.ts';
import { conditionalExpressionEmitter } from './expression/conditionalExpression.ts';
import { unaryExpressionEmitter } from './expression/unaryExpression.ts';
import { functionExpressionEmitter } from './expression/functionExpression.ts';
import { arrayLiteralEmitter } from './expression/arrayLiteralExpression.ts';
import { objectLiteralEmitter } from './expression/objectLiteralExpression.ts';
import { propertyAccessEmitter } from './expression/propertyAccessExpression.ts';
import { typeofEmitter } from './expression/typeofExpression.ts';
import { voidEmitter } from './expression/voidExpression.ts';
import { commaEmitter } from './expression/commaExpression.ts';
import { inExpressionEmitter } from './expression/inExpression.ts';
import { deleteEmitter } from './expression/deleteExpression.ts';
import { thisEmitter } from './expression/thisExpression.ts';
import { instanceofEmitter } from './expression/instanceofExpression.ts';
import { newEmitter } from './expression/newExpression.ts';
import { regExpLiteralEmitter } from './expression/regexpLiteralExpression.ts';
import { parenthesizedExpressionEmitter } from './expression/parenthesizedExpression.ts';
import { ImportClause, SyntaxKind, TypeFlags } from 'typescript';

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
  [ts.SyntaxKind.ParenthesizedExpression]: parenthesizedExpressionEmitter,
  [ts.SyntaxKind.ConditionalExpression]: conditionalExpressionEmitter,
  [ts.SyntaxKind.PrefixUnaryExpression]: unaryExpressionEmitter,
  [ts.SyntaxKind.PostfixUnaryExpression]: unaryExpressionEmitter,
  [ts.SyntaxKind.ArrayLiteralExpression]: arrayLiteralEmitter,
  [ts.SyntaxKind.ObjectLiteralExpression]: objectLiteralEmitter,
  [ts.SyntaxKind.PropertyAccessExpression]: propertyAccessEmitter,
  [ts.SyntaxKind.TypeOfExpression]: typeofEmitter,
  [ts.SyntaxKind.VoidExpression]: voidEmitter,
  [ts.SyntaxKind.DeleteExpression]: deleteEmitter,
  [ts.SyntaxKind.ThisKeyword]: thisEmitter,
  [ts.SyntaxKind.NewExpression]: newEmitter,
  [ts.SyntaxKind.RegularExpressionLiteral]: regExpLiteralEmitter,
  [ts.SyntaxKind.IfStatement]: ifStatementEmitter,
  [ts.SyntaxKind.WhileStatement]: whileStatementEmitter,
  [ts.SyntaxKind.DoStatement]: doWhileStatementEmitter,
  [ts.SyntaxKind.ForStatement]: forStatementEmitter,
  [ts.SyntaxKind.ForOfStatement]: forOfStatementEmitter,
  [ts.SyntaxKind.ForInStatement]: forInStatementEmitter,
  [ts.SyntaxKind.ContinueStatement]: continueStatementEmitter,
  [ts.SyntaxKind.BreakStatement]: breakStatementEmitter,
  [ts.SyntaxKind.SwitchStatement]: switchStatementEmitter,
  [ts.SyntaxKind.ThrowStatement]: throwStatementEmitter,
  [ts.SyntaxKind.TryStatement]: tryStatementEmitter,
  [ts.SyntaxKind.FunctionDeclaration]: functionDeclareEmitter,
  [ts.SyntaxKind.FunctionExpression]: functionExpressionEmitter,
  [ts.SyntaxKind.ReturnStatement]: returnStatementEmitter,
};

// Helper to check if a binary expression is an 'in' expression
export const isInExpression = (node: ts.Node): boolean => {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.InKeyword
  );
};

// Helper to check if a binary expression is an 'instanceof' expression
export const isInstanceofExpression = (node: ts.Node): boolean => {
  return (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword
  );
};

// Override the binary expression emitter for 'in' and 'instanceof' expressions
const originalBinaryExpressionEmitter =
  nodeToEmitter[ts.SyntaxKind.BinaryExpression];
nodeToEmitter[ts.SyntaxKind.BinaryExpression] = (
  node: ts.Node,
  option: EmitterOption
) => {
  if (isInExpression(node)) {
    return inExpressionEmitter(node as ts.BinaryExpression, option);
  }
  if (isInstanceofExpression(node)) {
    return instanceofEmitter(node as ts.BinaryExpression, option);
  }
  return originalBinaryExpressionEmitter(node, option);
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
  option: EmitterOption
): string => {
  // TODO: consider multiple files? import, export
  const idName = node.name ? node.name.getText() + '_' : '';
  return `__func_${idName}${node.pos}_${node.end}`;
};

// ---------------------------------------------------------------------------
// Object shapes -> named C structs (Theme 2)
//
// Each distinct object TYPE (shape) lowers to one C struct typedef. Shapes with
// the same sorted "field:cType" signature collapse to the same struct name, so
// `{ a: number }` is one C type everywhere it appears (vars, params, returns,
// array elements). The struct registry is module-global so a single transpile()
// run shares struct names across all emitters; `resetStructRegistry()` clears it
// at the start of each run (called from program.ts) to keep runs independent.
// ---------------------------------------------------------------------------

let structRegistry = new Map<string, StructDeclaration>();

export const resetStructRegistry = (): void => {
  structRegistry = new Map<string, StructDeclaration>();
};

export const getStructRegistry = (): Map<string, StructDeclaration> =>
  structRegistry;

// True for a plain object shape we can lower to a flat C struct: it has call/
// construct-free properties and is not an array, function, primitive, or union.
export const isLowerableObjectType = (type: ts.Type): boolean => {
  const flags = type.getFlags();
  // Only structural object types (anonymous shapes / interfaces), never unions,
  // primitives, arrays (which have a number index signature), or callables.
  if (!(flags & TypeFlags.Object)) {
    return false;
  }
  if (type.getCallSignatures().length > 0) {
    return false;
  }
  // Arrays / tuples expose a numeric index type; those are handled separately.
  if (type.getNumberIndexType?.()) {
    return false;
  }
  const props = type.getProperties();
  if (props.length === 0) {
    return false;
  }
  return true;
};

// Lower a plain object shape to its (registered) named C struct, returning the
// struct name. Fields lower in declaration order; each field's C type is itself
// lowered (so nested flat objects, numbers, strings, booleans all work). The
// stable name is derived from the sorted field:type signature so identical
// shapes share one struct. Throws if any field type cannot be lowered.
const lowerObjectType = (type: ts.Type): string => {
  const props = type.getProperties();
  const fields = props.map((sym) => {
    const decl = sym.valueDeclaration ?? sym.getDeclarations()?.[0];
    const fieldType = decl
      ? structChecker!.getTypeOfSymbolAtLocation(sym, decl)
      : (structChecker!.getDeclaredTypeOfSymbol(sym) as ts.Type);
    return { name: sym.getName(), cType: loweredType(fieldType) };
  });

  // Stable signature: sorted "name:cType" pairs so field ORDER in the source
  // does not produce a different struct for the same shape.
  const signature = fields
    .map((f) => `${f.name}:${f.cType}`)
    .slice()
    .sort()
    .join(',');

  const existing = structRegistry.get(signature);
  if (existing) {
    return existing.name;
  }

  // Derive a readable, collision-resistant name from the sorted signature.
  const slug = fields
    .map((f) => f.name)
    .slice()
    .sort()
    .join('_')
    .replace(/[^A-Za-z0-9_]/g, '_');
  let baseName = `Obj_${slug}`;
  // Disambiguate same-field-name-different-type shapes by appending a counter.
  let name = baseName;
  let counter = 1;
  const usedNames = new Set(
    Array.from(structRegistry.values()).map((s) => s.name)
  );
  while (usedNames.has(name)) {
    name = `${baseName}_${counter++}`;
  }

  structRegistry.set(signature, { name, fields });
  return name;
};

// The checker is needed to lower field types but `tsType2C`'s signature is fixed
// to (ts.Type). We stash the active checker here at the start of each transpile
// (set from program.ts) so object lowering can reach it.
let structChecker: ts.TypeChecker | undefined;
export const setStructChecker = (checker: ts.TypeChecker): void => {
  structChecker = checker;
};

// Single source of truth for "lowered TS type -> C type". Every site that turns
// a `ts.Type` into a C type token (function params/returns, closure fields,
// variable decls, for / for-of loop vars, program-level globals) routes through
// here so the scalar lowering rules live in exactly one place.
//
//   number    -> double   (floating; integers print cleanly via rts_print_number)
//   boolean   -> int
//   string    -> char *
//   void      -> void
//   null/undefined -> void *   (the JS "no value" scalars)
//   object    -> <StructName>  (a named C struct, by value; Theme 2)
//
// Returns `undefined` for types it cannot lower yet (arrays, function values) so
// callers with a legacy fallback keep working; `loweredType` / `tsType2CStrict`
// turn that into a loud "not support" error instead.
export const tsType2C = (node: ts.Type): string | undefined => {
  const flags = node.getFlags();
  if (flags & TypeFlags.NumberLike) {
    return 'double';
  } else if (flags & TypeFlags.StringLike) {
    return 'char *';
  } else if (flags & TypeFlags.BooleanLike) {
    return 'int';
  } else if (flags & TypeFlags.Void) {
    return 'void';
  } else if (flags & (TypeFlags.Null | TypeFlags.Undefined)) {
    return 'void *';
  } else if (structChecker && isLowerableObjectType(node)) {
    return lowerObjectType(node);
  }
  return undefined;
};

// The dedicated "lowered type -> C type" mapper (Theme 1). Fails loudly instead
// of leaking the token "undefined" into emitted C. This is the entry point the
// per-node emitters should call; `tsType2CStrict` is kept as a back-compat alias.
// Aggregate/value lowering (objects, arrays, function values as types) is owned
// by the later themes and still throws here.
export const loweredType = (node: ts.Type): string => {
  const cType = tsType2C(node);
  if (cType === undefined) {
    throw new Error(
      'not support: cannot lower this type to a C type yet (objects, arrays, ' +
        'and function values are not yet supported as parameter/return/closure types)'
    );
  }
  return cType;
};

// Back-compat alias for the strict mapper; new code should prefer `loweredType`.
export const tsType2CStrict = loweredType;

// The C element type for an array-typed value, derived from its number index
// type (so a `number[]` -> "double"). Defaults to "double" — the only element
// type the array storage currently supports — when the element type cannot be
// determined or lowered yet.
export const arrayElementCType = (arrayType: ts.Type): string => {
  try {
    const elementType =
      arrayType.getNumberIndexType?.() ??
      (arrayType as any).getNumberIndexType?.();
    if (elementType) {
      return loweredType(elementType);
    }
  } catch {
    // fall through to default
  }
  return 'double';
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
  kind: ts.BinaryOperator
): kind is ts.CompoundAssignmentOperator {
  return (
    kind >= ts.SyntaxKind.FirstCompoundAssignment &&
    kind <= ts.SyntaxKind.LastCompoundAssignment
  );
}

/** start EnvRecord */
export const connectChildEnvRecord = (
  envRecord: EnvRecord,
  childEnv: EnvRecord
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

  return declareString.join('\n');
};

const allClosureVars = (functionEnvRecord: EnvRecord): Set<ts.Identifier> => {
  // console.log("########## functionEnvRecord:", functionEnvRecord);
  const closureVars = diff(
    functionEnvRecord.allVars,
    functionEnvRecord.boundVars
  );

  return union(closureVars, ...functionEnvRecord.children.map(allClosureVars));
};

const structClosure = (
  functionEnvRecord: EnvRecord,
  { checker }: EmitterOption
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
      declareVarStrings[varName] = `${loweredType(typeNode)} ${varName};`;
    }
  });

  const declareString = Object.values(declareVarStrings).join('\n');

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
