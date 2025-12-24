import { Emitter } from '../../type';
import ts from 'typescript';

export const continueStatementEmitter: Emitter<ts.ContinueStatement> = (
  node,
  option
) => {
  return {
    emit: () => {
      return 'continue;';
    },

    getAllVars: () => new Set<ts.Identifier>(),
  };
};
