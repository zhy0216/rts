import { Emitter } from "../../type";
import ts from "typescript";

export const identifierEmitter: Emitter<ts.Identifier> = (node) => {
  return {
    emit: () => node.getText(),
    getVars: () => new Set<ts.Identifier>([node]),
  };
};
