import { Emitter } from '../../type';
import ts from 'typescript';
import { emitFunctionLike } from '../statement/functionDeclare.ts';

// A function expression (`const f = function () {}`) shares ALL of its capture
// machinery with function declarations: Theme 4 unified the two paths so a
// function-expression closure captures an outer local identically to a nested
// function declaration. The only surface difference — a function expression is
// a VALUE — is handled by the shared core's `emitName` flag, which makes emit()
// return the generated C function name (for binding as a function pointer) and
// exposes getFunctionType() for the holding variable's declarator.
export const functionExpressionEmitter: Emitter<ts.FunctionExpression> = (
  node,
  option
) => emitFunctionLike(node, option, true);
