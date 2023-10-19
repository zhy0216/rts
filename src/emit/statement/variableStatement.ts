import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode } from "../helper";

export const variableStatement: Emitter<ts.VariableStatement> = (
  variableSTNode,
  option,
) => {
  const { envRecord } = option;
  const initEmitters: Emitter[] = [];
  variableSTNode.declarationList.declarations.forEach((node) => {
    // TODO: object binding
    if (node.initializer) {
      const emitter = getEmitNode(node.initializer, option);
      emitter && initEmitters.push();
    }
    envRecord.identifiers.push(node.name as ts.Identifier);
  });
  return {
    emit: () => "",
  };
};
