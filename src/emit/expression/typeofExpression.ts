import { Emitter } from '../../type';
import ts, { TypeFlags } from 'typescript';
import { getEmitNode } from '../helper';

// rts is a fully static subset, so `typeof` is resolved at COMPILE TIME from the
// operand's static type and emitted as a C string literal of the JS type name.
// No runtime rts_typeof dependency.
const jsTypeName = (type: ts.Type): string => {
  const flags = type.getFlags();
  if (flags & TypeFlags.NumberLike) return 'number';
  if (flags & TypeFlags.StringLike) return 'string';
  if (flags & TypeFlags.BooleanLike) return 'boolean';
  if (flags & TypeFlags.Undefined) return 'undefined';
  // JS quirk: `typeof null === "object"`.
  if (flags & TypeFlags.Null) return 'object';
  // Functions report "function"; objects and arrays report "object".
  if (type.getCallSignatures().length > 0) return 'function';
  return 'object';
};

/**
 * Emitter for typeof expressions.
 * Static (compile-time) resolution -> a literal C string of the JS type name.
 */
export const typeofEmitter: Emitter<ts.TypeOfExpression> = (node, option) => {
  const { checker } = option;
  // Still build the operand emitter so getAllVars stays correct, but its value is
  // not used: typeof never evaluates its operand for side effects in this subset.
  const expressionEmitter = getEmitNode(node.expression, option);
  const type = checker.getTypeAtLocation(node.expression);

  return {
    emit: () => `"${jsTypeName(type)}"`,
    getAllVars: () => expressionEmitter.getAllVars(),
  };
};
