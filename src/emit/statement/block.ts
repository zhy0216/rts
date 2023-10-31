import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

export const blockEmitter: Emitter<ts.Block> = (node, option) => {
  const emitNodes = node.statements.map((s) => getEmitNode(s, option));
  return {
    emit: () => `{\n ${emitNodes.map((en) => en.emit()).join("\n")}\n}`,

    getAllVars: () => union(...emitNodes.map((en) => en.getAllVars())),
  };
};
