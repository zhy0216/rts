import * as ts from "typescript";
import { AstNode, Emitter } from "./type";
import { getEmitNode, union } from "./emit/helper";
// import { CallExpression } from "./expression/CallExpression";

export const transpile = (sourceCode: string): string => {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    sourceCode,
    ts.ScriptTarget.ES5,
    true,
  );
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName, target) => sourceFile,
    writeFile: (name, text, writeByteOrderMark) => {},
    getDefaultLibFileName: () => {
      return "lib.d.ts";
    },
    useCaseSensitiveFileNames: () => {
      return false;
    },
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    getNewLine: () => "\n",
    fileExists: (fileName) => fileName === "source.ts",
    readFile: (fileName) => (fileName == "source.ts" ? sourceCode : undefined),
    directoryExists: (dirName) => dirName === "",
  };
  const tsProgram = ts.createProgram(
    ["source.ts"],
    { noLib: true },
    compilerHost,
  );
  const checker = tsProgram.getTypeChecker();

  const programEmit = programEmitter(tsProgram, {
    checker,
    envRecord: {
      identifiers: [],
    },
    fns: [],
  });
  return programEmit?.emit() ?? "";
};

export const programEmitter: Emitter<ts.Program> = (tsProgram, option) => {
  const statementEmitNodes: AstNode[] = [];

  const sources = tsProgram
    .getSourceFiles()
    .filter((s) => !s.isDeclarationFile);

  for (let source of sources) {
    for (let s of source.statements) {
      try {
        statementEmitNodes.push(getEmitNode(s, option));
      } catch (e) {
        console.log(e);
      }
    }
  }

  return {
    emit: () => {
      return `
#include <stdio.h>

${option.fns.map((f) => f.declare).join("\n")}

${option.fns.map((f) => f.implementation).join("\n\n")}
    
int main(void) {
    ${statementEmitNodes.map((s) => s.emit()).join("\n")}
    return 0;
}
`;
    },

    getVariables: () =>
      union(...statementEmitNodes.map((en) => en.getVariables())),
  };
};
