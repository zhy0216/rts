import { EmitNode, Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode } from "../helper";

export const variableStatement: Emitter<ts.VariableStatement> = (
  variableSTNode,
  option,
) => {
  const { envRecord, checker } = option;
  const initEmitters: Record<string, EmitNode | undefined> = {};
  const declarationStrings: string[] = [];
  variableSTNode.declarationList.declarations.forEach((node) => {
    // TODO: object binding
    if (node.initializer) {
      initEmitters[node.name.getText()] = getEmitNode(node.initializer, option);
    }
    envRecord.identifiers.push(node.name as ts.Identifier);
    const type = checker.getTypeAtLocation(node);
    if (type.getFlags() & TypeFlags.Number) {
      declarationStrings.push(`int ${node.name.getText()}`);
    }

    const initString = initEmitters[node.name.getText()]?.emit();
    if (initString) {
      declarationStrings.push(" = " + initString);
    }
    declarationStrings.push(";\n");
  });

  return {
    emit: () => declarationStrings.join(""),
  };
};
