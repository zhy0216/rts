import { Emitter } from "../../type";
import ts, { TypeFlags } from "typescript";
import { getEmitNode, getFunctionName, union } from "../helper";

export const callExpressionEmitter: Emitter<ts.CallExpression> = (
  node,
  option,
) => {
  const { checker } = option;
  const argsEmitNodes = node.arguments.map((tNode) =>
    getEmitNode(tNode, option),
  );
  return {
    emit: () => {
      // TODO: move this to std
      if (node.expression.getText() == "console.log") {
        const argument = node.arguments[0];
        const type = checker.getTypeAtLocation(argument);
        const emitStrings: string[] = [];
        if (type.isStringLiteral()) {
          emitStrings.push(`printf("\\"%s\\"\\n", ${argument.getText()})`);
        }

        if (type.getFlags() & TypeFlags.NumberLike) {
          // TODO: consider number is int first
          emitStrings.push(
            `printf("%d\\n", ${getEmitNode(argument, option).emit()})`,
          );
        }

        if (type.getFlags() & TypeFlags.BooleanLike) {
          emitStrings.push(
            `printf("%s\\n", ${getEmitNode(
              argument,
              option,
            ).emit()}?"true": "false")`,
          );
        }

        return emitStrings.join(";\n");
      }

      if (ts.isIdentifier(node.expression)) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (!symbol) {
          // something wrong
          return "";
        }
        const fnDeclare = symbol.getDeclarations()?.[0];
        const fnName = fnDeclare
          ? getFunctionName(fnDeclare as ts.FunctionDeclaration, option)
          : "";
          
        // Check if the function needs a closure context
        const needsClosureContext = fnDeclare && (ts.isFunctionDeclaration(fnDeclare.parent) || ts.isFunctionExpression(fnDeclare.parent));
        
        // Get arguments as they are
        let argsList = node.arguments
          .map((argNode) => getEmitNode(argNode, option).emit());
          
        // If we need to pass closure context, create one and pass it
        if (needsClosureContext) {
          // Need to pass closure_ctx as the first argument
          const closureName = option.envRecord.closureName || "closure";
          const closureCtx = `&(struct ${closureName}) { `;
          
          // Add all variables from the current scope that might be needed in the called function
          const closureVars = option.envRecord.allVars;
          const closureVarInits: string[] = [];
          
          closureVars.forEach(varIdentifier => {
            closureVarInits.push(`.${varIdentifier.getText()} = ${varIdentifier.getText()}`);
          });
          
          // Add the closure context as the first argument
          argsList.unshift(`${closureCtx}${closureVarInits.join(", ")} }`);
        }
        
        const args = argsList.join(",");
        
        return `${fnName}(${args})`;
      }

      return ``;
    },

    getAllVars: () => {
      return union(...argsEmitNodes.map((node) => node.getAllVars()));
    },
  };
};
