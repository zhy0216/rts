import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode } from '../helper';

/**
 * Emitter for parenthesized (grouping) expressions: `( expr )`
 * Preserves grouping by wrapping the inner expression in C parentheses.
 */
export const parenthesizedExpressionEmitter: Emitter<
  ts.ParenthesizedExpression
> = (node, option) => {
  const expressionEmitter = getEmitNode(node.expression, option);

  return {
    emit: () => `(${expressionEmitter.emit()})`,
    getAllVars: () => expressionEmitter.getAllVars(),
  };
};
