import { Emitter } from '../../type';
import ts from 'typescript';

/**
 * Emitter for `this` expressions.
 *
 * Inside a class method/constructor body (Theme 5) `this` is the receiver
 * pointer parameter, whose C name is threaded through option.thisName (e.g.
 * "self"). Outside class members it falls back to the global this_context.
 */
export const thisEmitter: Emitter<ts.ThisExpression> = (node, option) => {
  return {
    emit: () => {
      if (option.thisName) {
        return option.thisName;
      }
      return 'this_context';
    },

    getAllVars: () => {
      // No variables used here
      return new Set();
    },
  };
};
