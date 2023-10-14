import * as ts from 'typescript'
import { Emitter } from './type';
import { Statement } from './statement';
import { EmptyStatement } from './statement/EmptyStatement';

const nodeToEmitter: Record<string, ((node: ts.Node) => Emitter) | undefined> = {
    [ts.SyntaxKind.EmptyStatement]: _ => new EmptyStatement()

}

export class Program implements Emitter {
    statements: Statement[] = []


    constructor(sourceCode: string) {
        const sourceFile = ts.createSourceFile('source.ts', sourceCode, ts.ScriptTarget.ES5, true);
        const compilerHost: ts.CompilerHost = {
            getSourceFile: (fileName, target) => 'source.ts' ? sourceFile : null,
            writeFile: (name, text, writeByteOrderMark) => { },
            getDefaultLibFileName: () => { return "lib.d.ts"; },
            useCaseSensitiveFileNames: () => { return false; },
            getCanonicalFileName: fileName => fileName,
            getCurrentDirectory: () => "",
            getDirectories: () => [],
            getNewLine: () => "\n",
            fileExists: fileName => fileName == 'source.ts',
            readFile: fileName => fileName == 'source.ts' ? sourceCode : null,
            directoryExists: dirName => dirName == "",
        };
        const tsProgram = ts.createProgram(['source.ts'], { noLib: true }, compilerHost);
        const tsTypeChecker = tsProgram.getTypeChecker();
        const sources = tsProgram.getSourceFiles().filter(s => !s.isDeclarationFile);
        // ts.isBinaryExpression
        for (let source of sources) {
            for (let s of source.statements) {
                if(s.kind in nodeToEmitter) {
                    this.statements.push(nodeToEmitter[s.kind](s))
                } else {
                    console.log("not support:", s.getText())
                }
            }
                
        }



    }

    emit = () => {
        return `
            int main(void) {
                ${this.statements.map(s => s.emit())}
                return 0;
            }
        `

    };
}