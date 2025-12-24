import { Emitter } from '../../type';
import ts from 'typescript';
import {
  connectChildEnvRecord,
  diff,
  getEmitNode,
  getFunctionName,
  tsType2C,
  union,
} from '../helper.ts';

export const functionExpressionEmitter: Emitter<ts.FunctionExpression> = (
  node,
  option
) => {
  const { checker, fns, envRecord } = option;
  // Generate a unique function name for the function expression
  const functionName = getFunctionName(node, option);
  const functionType = checker.getTypeAtLocation(node);
  const signature = checker.getSignaturesOfType(
    functionType,
    ts.SignatureKind.Call
  )[0];

  // Build the parameter string from function parameters
  let parameterList = node.parameters.map((p) => {
    const pType = tsType2C(checker.getTypeAtLocation(p));
    return `${pType} ${p.name.getText()}`;
  });

  const parameterString = parameterList.join(', ');
  const returnType = checker.getReturnTypeOfSignature(signature);
  const returnTypeStr = tsType2C(returnType);
  const getAllVars = () => union(bodyNode?.getAllVars());

  const functionEnvRecord = connectChildEnvRecord(envRecord, {
    closureName: envRecord.closureName ?? functionName + '_closure',
    children: [],
    name: functionName,
    boundVars: new Set(
      node.body?.statements
        .filter(ts.isVariableStatement)
        .flatMap((n) =>
          n.declarationList.declarations
            .map((d) => d.name)
            .filter(ts.isIdentifier)
        )
    ),
    parent: envRecord,
    allVars: new Set(),
  });

  const bodyNode = node.body
    ? getEmitNode(node.body, {
        ...option,
        envRecord: functionEnvRecord,
      })
    : undefined;

  functionEnvRecord.allVars = getAllVars();

  return {
    emit: () => {
      // Get the original body
      let bodyString = bodyNode?.emit() ?? '';

      // Generate the function declaration string
      const declareString = `${returnTypeStr} ${functionName}(${parameterString})`;

      fns.push({
        declare: declareString + ';',
        implementation: `${declareString} ${bodyString};`,
      });

      // Return a correctly formatted function pointer reference
      // to be used in variable assignments
      return functionName;
    },
    getAllVars,
    // Include function type information for use by variable declaration
    getFunctionType: () => {
      return `${returnTypeStr} (*)(${parameterList.map((p) => p.split(' ')[0]).join(', ')})`;
    },
  };
};
