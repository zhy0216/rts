import * as ts from "typescript";
import { EmitNode, Emitter } from "./type";
import { emptyStatementEmitter } from "./statement/EmptyStatement";
// import { CallExpression } from "./expression/CallExpression";

const nodeToEmitter: Record<string, Emitter> = {
  [ts.SyntaxKind.EmptyStatement]: emptyStatementEmitter,
  // [ts.SyntaxKind.CallExpression]: (node, option) =>
  //   new CallExpression(node as ts.CallExpression, option),
};

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
  return programEmit.emit();
};

export const programEmitter: Emitter<ts.Program> = (tsProgram, { checker }) => {
  const statementEmitNodes: EmitNode[] = [];

  const sources = tsProgram
    .getSourceFiles()
    .filter((s) => !s.isDeclarationFile);
  // ts.isBinaryExpression
  for (let source of sources) {
    for (let s of source.statements) {
      if (s.kind in nodeToEmitter) {
        statementEmitNodes.push(nodeToEmitter[s.kind](s, { checker }));
      } else {
        console.log("not support:", s.getText());
      }
    }
  }

  return {
    emit: () => {
      return `
#include <stdio.h>
    
int main(void) {
    ${statementEmitNodes.map((s) => s.emit())}
    return 0;
}
`;
    },
  };
};
