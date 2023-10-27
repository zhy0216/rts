import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, getFunctionName, tsType2C } from "../helper.ts";

export const functionDeclareEmitter: Emitter<ts.FunctionDeclaration> = (
  node,
  option,
) => {
  const { checker, fns } = option;
  // const nodeSymbol = checker.getSymbolAtLocation(node);
  // node.name

  const functionName = getFunctionName(node, option);
  const functionType = checker.getTypeAtLocation(node);
  const signature = checker.getSignaturesOfType(
    functionType,
    ts.SignatureKind.Call,
  )[0];
  const parameterString = node.parameters
    .map((p) => {
      const pType = tsType2C(checker.getTypeAtLocation(p));
      return `${pType} ${p.name.getText()}`;
    })
    .join(", ");
  const returnType = checker.getReturnTypeOfSignature(signature);
  const bodyString = node.body ? getEmitNode(node.body, option).emit() : "";
  const declareString = `${tsType2C(
    returnType,
  )} ${functionName}(${parameterString})`;
  fns.push({
    declare: declareString + ";",
    implementation: `${declareString} ${bodyString};`,
  });
  // node.parameters
  return {
    emit: () => "",
  };
};
