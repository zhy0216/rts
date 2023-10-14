import * as ts from 'typescript'
import { Emitter } from './type';
import { Statement } from './statement';



export class Program implements Emitter {
    statements: Statement[] = []


    constructor(source: string) {
        const sourceFile = ts.createSourceFile('source.ts', source, ts.ScriptTarget.ES5, true);
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
            readFile: fileName => fileName == 'source.ts' ? source : null,
            directoryExists: dirName => dirName == "",
        };
        const tsProgram = ts.createProgram(['source.ts'], { noLib: true }, compilerHost);
        const tsTypeChecker = tsProgram.getTypeChecker();
        const sources = tsProgram.getSourceFiles().filter(s => !s.isDeclarationFile);



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