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
  const getVars = () => union(bodyNode?.getVars());
  const getUnboundVars = () => diff(getVars(), new Set(envRecord.vars));
  const bodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: connectChildEnvRecord(envRecord, {
          closureName: envRecord.closureName ?? functionName + "_closure",
          children: [],
          name: functionName,
          vars: new Set(),
          parent: envRecord,
          getClosureVars: getUnboundVars,
        }),
      })
    : undefined;
  // console.log("####### functionName: bodyNode?.getVariables():", functionName);
  // bodyNode
  //   ?.getVariables()
  //   .forEach((v) => console.log(v.getFullText(), v.getFullStart()));
  // console.log("####### envRecord");
  // envRecord.identifiers.forEach((v) => console.log(v.getText(), v.pos));

  // const hasUnboundVars = getUnboundVars().size > 0;

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
    getVars,
    getUnboundVars,
  };
};
