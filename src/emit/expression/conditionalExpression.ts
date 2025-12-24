import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper.ts';

export const conditionalExpressionEmitter: Emitter<ts.ConditionalExpression> = (
  node,
  option
) => {
  const conditionEmitNode = getEmitNode(node.condition, option);
  const whenTrueEmitNode = getEmitNode(node.whenTrue, option);
  const whenFalseEmitNode = getEmitNode(node.whenFalse, option);

  return {
    emit: () => {
      const conditionString = conditionEmitNode.emit();
      const whenTrueString = whenTrueEmitNode.emit();
      const whenFalseString = whenFalseEmitNode.emit();

      // In C, the ternary operator has the same syntax as in JavaScript
      return `(${conditionString} ? ${whenTrueString} : ${whenFalseString})`;
    },

    getAllVars: () =>
      union(
        conditionEmitNode.getAllVars(),
        whenTrueEmitNode.getAllVars(),
        whenFalseEmitNode.getAllVars()
      ),
  };
};
