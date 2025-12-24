import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for do-while statements
 * In C, we'll implement this using a standard do-while loop
 */
export const doWhileStatementEmitter: Emitter<ts.DoStatement> = (
  node,
  option
) => {
  // The statement to be executed in the loop body
  const statementEmitter = getEmitNode(node.statement, option);

  // The condition to check after each loop iteration
  const expressionEmitter = getEmitNode(node.expression, option);

  return {
    emit: () => {
      const statement = statementEmitter.emit();
      const expression = expressionEmitter.emit();

      // Generate C code for do-while loop
      return `
do {
  ${statement}
} while (${expression});`;
    },

    getAllVars: () => {
      const statementVars = statementEmitter.getAllVars();
      const expressionVars = expressionEmitter.getAllVars();

      return union(statementVars, expressionVars);
    },
  };
};
