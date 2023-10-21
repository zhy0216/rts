import { Emitter } from "../../type";
import ts from "typescript";

export const identifierEmitter: Emitter<ts.Identifier> = (node) => ({
  emit: () => node.getText(),
});
