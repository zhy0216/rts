import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper.ts';

export const whileStatementEmitter: Emitter<ts.WhileStatement> = (
  node,
  option
) => {
  const conditionEmitNode = getEmitNode(node.expression, option);
  const bodyEmitNode = getEmitNode(node.statement, option);

  return {
    emit: () => {
      const conditionString = conditionEmitNode.emit();
      const bodyString = bodyEmitNode.emit();

      return `while(${conditionString}) ${bodyString}`;
    },

    getAllVars: () =>
      union(conditionEmitNode.getAllVars(), bodyEmitNode.getAllVars()),
  };
};
