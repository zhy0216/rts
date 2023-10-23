import { Emitter } from "../../type";
import ts from "typescript";
import { getFunctionName } from "../helper.ts";

export const functionDeclareEmitter: Emitter<ts.FunctionDeclaration> = (
  node,
  option,
) => {
  const { checker } = option;
  // const nodeSymbol = checker.getSymbolAtLocation(node);
  // node.name

  const functionName = getFunctionName(node, option);
  const functionType = checker.getTypeAtLocation(node);
  const signature = checker.getSignaturesOfType(
    functionType,
    ts.SignatureKind.Call,
  )[0];
  const returnType = checker.getReturnTypeOfSignature(signature);
  // node.parameters
  return {
    emit: () => "",
  };
};
