import { Emitter } from "../../type";
import ts from "typescript";

export const breakStatementEmitter: Emitter<ts.BreakStatement> = (node, option) => {
  return {
    emit: () => {
      return "break;";
    },

    getAllVars: () => new Set<ts.Identifier>(),
  };
};
