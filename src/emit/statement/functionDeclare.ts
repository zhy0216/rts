import { Emitter } from "../../type";
import ts from "typescript";
import {
  connectChildEnvRecord,
  diff,
  getEmitNode,
  getFunctionName,
  tsType2C,
  union,
} from "../helper.ts";
import { env } from "bun";

export const functionDeclareEmitter: Emitter<
  ts.FunctionDeclaration | ts.FunctionExpression
> = (node, option) => {
  const { checker, fns, envRecord } = option;
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
  const getAllVars = () => union(bodyNode?.getAllVars());
  // const getUnboundVars = () =>
  //   diff(getAllVars(), new Set(envRecord.getBoundVars()));
  const bodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: connectChildEnvRecord(envRecord, {
          closureName: envRecord.closureName ?? functionName + "_closure",
          children: [],
          name: functionName,
          getBoundVars: () => new Set(),
          parent: envRecord,
          getUnboundVars: () => new Set(),
        }),
      })
    : undefined;

  // node.parameters
  return {
    emit: () => {
      const bodyString = bodyNode?.emit() ?? "";
      const declareString = `${tsType2C(
        returnType,
      )} ${functionName}(${parameterString})`;

      fns.push({
        declare: declareString + ";",
        implementation: `${declareString} ${bodyString};`,
      });

      return "";
    },
    getAllVars,
  };
};
