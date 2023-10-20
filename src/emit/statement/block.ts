import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper";

export const blockEmitter: Emitter<ts.Block> = (node, option) => ({
  emit: () =>
    `{ ${node.statements
      .map((s) => getEmitNode(s, option)?.emit() ?? "")
      .join("\n")} }`,
});
