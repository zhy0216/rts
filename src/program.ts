import * as ts from "typescript";
import { EmitNode, Emitter } from "./type";
import { getEmitNode } from "./emit/helper";
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

  const programEmit = programEmitter(tsProgram, { checker });
  return programEmit?.emit() ?? "";
};

export const programEmitter: Emitter<ts.Program> = (tsProgram, option) => {
  const statementEmitNodes: EmitNode[] = [];

  const sources = tsProgram
    .getSourceFiles()
    .filter((s) => !s.isDeclarationFile);

  for (let source of sources) {
    for (let s of source.statements) {
      const node = getEmitNode(s, option);
      node && statementEmitNodes.push(node);
    }
  }

  return {
    emit: () => {
      return `
#include <stdio.h>
    
int main(void) {
    ${statementEmitNodes.map((s) => s.emit()).join("")}
    return 0;
}
`;
    },
  };
};
