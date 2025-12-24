import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for new expressions
 * This implements the JavaScript new operator in C
 */
export const newEmitter: Emitter<ts.NewExpression> = (node, option) => {
  // Get the expression being constructed (the constructor)
  const expressionEmitter = getEmitNode(node.expression, option);

  // Process the arguments to the constructor
  const argumentEmitters = node.arguments
    ? node.arguments.map((arg) => getEmitNode(arg, option))
    : [];

  return {
    emit: () => {
      const expression = expressionEmitter.emit();
      const args = argumentEmitters.map((arg) => arg.emit()).join(', ');

      // In JavaScript, new creates a new instance of an object using a constructor
      // In our C implementation, we'll use a helper function
      if (argumentEmitters.length > 0) {
        return `rts_new(${expression}, ${args})`;
      } else {
        return `rts_new(${expression})`;
      }
    },

    getAllVars: () => {
      return union(
        expressionEmitter.getAllVars(),
        ...argumentEmitters.map((arg) => arg.getAllVars())
      );
    },
  };
};
