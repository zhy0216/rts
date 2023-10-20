import { Emitter } from "../../type";
import { node } from "execa";
import ts from "typescript";

export const identifierEmitter: Emitter<ts.Identifier> = (node) => ({
  emit: () => node.getText(),
});
