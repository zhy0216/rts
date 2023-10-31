import { AstNode, Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode, union } from "../helper";

export const variableStatement: Emitter<ts.VariableStatement> = (
  variableSTNode,
  option,
) => {
  const { envRecord, checker } = option;
  const initEmitters: Record<string, AstNode | undefined> = {};
  const declarationStrings: string[] = [];
  const s = new Set<ts.Identifier>();
  variableSTNode.declarationList.declarations.forEach((node) => {
    // TODO: object binding
    if (node.initializer) {
      initEmitters[node.name.getText()] = getEmitNode(node.initializer, option);
    }
    if (ts.isIdentifier(node.name)) {
      s.add(node.name);
    }
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
    getAllVars: () =>
      union(s, ...Object.values(initEmitters).map((en) => en?.getAllVars())),
  };
};
