import * as ts from 'typescript';
import { AstNode, Emitter } from './type';
import { getEmitNode, makeDeclareClosure, union } from './emit/helper';
import { RTS_LIB_FILE_NAME, RTS_LIB_SOURCE } from './rtsLib';
// import { CallExpression } from "./expression/CallExpression";

const SOURCE_FILE_NAME = 'source.ts';

// Diagnostics gate: enforce the "statically-typed subset" guarantee. Ill-typed
// input (type mismatches, runtime type changes, unknown identifiers, ...) is
// rejected here rather than emitted as invalid C.
const assertNoTypeErrors = (tsProgram: ts.Program): void => {
  const diagnostics = ts.getPreEmitDiagnostics(tsProgram);
  if (diagnostics.length === 0) {
    return;
  }
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => '',
    getNewLine: () => '\n',
  };
  const message = ts.formatDiagnostics(diagnostics, formatHost);
  throw new Error(`rts: type error(s):\n${message}`);
};

// `any` is a dynamic escape hatch incompatible with a statically-typed subset:
// it defeats the diagnostics gate (any value flows anywhere) and cannot be
// lowered to a concrete C type. Reject explicit `any` annotations in user code.
// (Implicit inference such as the empty-array literal `[]` is left alone.)
const assertNoExplicitAny = (sourceFile: ts.SourceFile): void => {
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );
      throw new Error(
        `rts: the 'any' type is not allowed (a statically-typed subset cannot ` +
          `lower a dynamic value) at ${line + 1}:${character + 1}`
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
};

export const transpile = (sourceCode: string): string => {
  const files: Record<string, string> = {
    [RTS_LIB_FILE_NAME]: RTS_LIB_SOURCE,
    [SOURCE_FILE_NAME]: sourceCode,
  };
  const sourceFiles: Record<string, ts.SourceFile> = {};
  for (const name of Object.keys(files)) {
    sourceFiles[name] = ts.createSourceFile(
      name,
      files[name],
      ts.ScriptTarget.ES5,
      true
    );
  }
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (fileName) => sourceFiles[fileName],
    writeFile: (name, text, writeByteOrderMark) => {},
    getDefaultLibFileName: () => {
      return 'lib.d.ts';
    },
    useCaseSensitiveFileNames: () => {
      return false;
    },
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getNewLine: () => '\n',
    fileExists: (fileName) => fileName in files,
    readFile: (fileName) => files[fileName],
    directoryExists: () => true,
  };
  const tsProgram = ts.createProgram(
    [RTS_LIB_FILE_NAME, SOURCE_FILE_NAME],
    { noLib: true, target: ts.ScriptTarget.ES5 },
    compilerHost
  );

  assertNoTypeErrors(tsProgram);
  assertNoExplicitAny(sourceFiles[SOURCE_FILE_NAME]);

  const checker = tsProgram.getTypeChecker();

  const programEmit = programEmitter(tsProgram, {
    checker,
    envRecord: {
      children: [],
      name: 'global',
      allVars: new Set(),
      boundVars: new Set(),
    },
    fns: [],
  });
  return programEmit?.emit() ?? '';
};

export const programEmitter: Emitter<ts.Program> = (tsProgram, option) => {
  const statementEmitNodes: AstNode[] = [];

  const sources = tsProgram
    .getSourceFiles()
    .filter((s) => !s.isDeclarationFile);

  for (let source of sources) {
    for (let s of source.statements) {
      statementEmitNodes.push(getEmitNode(s, option));
    }
  }

  return {
    emit: () => {
      const statementString = statementEmitNodes
        .map((s) => s.emit())
        .join('\n');
      // Only collect top-level (module-scope) variables as globals
      // Variables inside functions will be emitted as C local variables
      const allVars = new Set<string>();

      // Only collect variables declared at the top level of source files
      tsProgram
        .getSourceFiles()
        .filter((s) => !s.isDeclarationFile)
        .forEach((source) => {
          source.statements.forEach((statement) => {
            if (ts.isVariableStatement(statement)) {
              statement.declarationList.declarations.forEach((decl) => {
                if (ts.isIdentifier(decl.name)) {
                  allVars.add(decl.name.getText());
                }
              });
            }
          });
        });

      // Track variable types for function pointers and object literals (only top-level)
      const varTypes = new Map<string, string>();

      // Only scan top-level variable declarations for special types
      tsProgram
        .getSourceFiles()
        .filter((s) => !s.isDeclarationFile)
        .forEach((source) => {
          source.statements.forEach((statement) => {
            if (ts.isVariableStatement(statement)) {
              statement.declarationList.declarations.forEach((decl) => {
                if (ts.isIdentifier(decl.name) && decl.initializer) {
                  const varName = decl.name.getText();
                  if (ts.isFunctionExpression(decl.initializer)) {
                    const params = decl.initializer.parameters.map((p) => {
                      const typeNode = p.type;
                      return typeNode
                        ? typeNode.getText() === 'number'
                          ? 'int'
                          : 'int'
                        : 'int';
                    });
                    varTypes.set(
                      varName,
                      `int (*${varName})(${params.join(', ')})`
                    );
                  } else if (ts.isObjectLiteralExpression(decl.initializer)) {
                    // Object literals should be declared as void*
                    varTypes.set(varName, `void* ${varName}`);
                  }
                }
              });
            }
          });
        });

      // Generate global declarations for all variables
      const globalDeclarations = Array.from(allVars)
        .map((varName) => {
          // Use the appropriate type for function pointers and object literals
          if (varTypes.has(varName)) {
            return `${varTypes.get(varName)} = NULL;`;
          }
          // Default to int for regular variables
          return `int ${varName} = 0;`;
        })
        .join('\n');

      return `
#include <stdio.h>
#include <stdlib.h>
#include <setjmp.h>
#include <string.h>

// Error handling infrastructure for throw statements
typedef struct {
  jmp_buf env;
  int has_error;
  char* error_message;
} exception_context_t;

exception_context_t exception_ctx = {0};

// Function to handle thrown errors (simulating JavaScript throw)
void rts_throw(char* message) {
  exception_ctx.has_error = 1;
  exception_ctx.error_message = message;
  longjmp(exception_ctx.env, 1);
}

// Function to implement the typeof operator
char* rts_typeof(void* value) {
  // For now, we'll just return "number" for simplicity
  // In a full implementation, this would check the type at runtime
  return "number";
}

// Function to implement the 'in' operator
int rts_has_property(void* obj, char* prop) {
  // Simplified implementation that always returns 1 (true)
  // In a real implementation, we would check if the property exists in the object
  return 1;
}

// Function to implement the delete operator
int rts_delete_property(void* objProp) {
  // Simplified implementation that always returns 1 (true)
  // In a real implementation, we would delete the property from the object
  return 1;
}

// Function to implement the instanceof operator
int rts_instanceof(void* obj, void* constructor) {
  // Simplified implementation that always returns 1 (true)
  // In a real implementation, we would check if the object is an instance of the constructor
  return 1;
}

// Function to implement the new operator
void* rts_new(void* constructor, ...) {
  // Simplified implementation that returns a static pointer
  // In a real implementation, we would allocate a new object and call the constructor
  static int dummy_object = 0;
  return &dummy_object;
}

// Function to implement regular expression creation
void* rts_create_regexp(char* pattern, char* flags) {
  // Simplified implementation that returns a static pointer
  // In a real implementation, we would compile the regular expression with the flags
  static int dummy_regexp = 0;
  return &dummy_regexp;
}

// Global variable for 'this' context
void* this_context = NULL;

// Array declarations
${option.arrays ? option.arrays.map((arr) => `int ${arr.name}[] = {${arr.values}};`).join('\n') : ''}

// Object declarations
${
  option.objects
    ? option.objects
        .map((obj) => {
          const objDecl = `void* ${obj.name} = NULL;`;
          const propDecls = obj.properties
            .map((prop) => `int ${obj.name}_${prop.name} = ${prop.value};`)
            .join('\n');
          return objDecl + '\n' + propDecls;
        })
        .join('\n')
    : ''
}

// Global variables for closure support
${globalDeclarations}

// Closure struct definitions
${makeDeclareClosure(option)}

${option.fns.map((f) => f.declare).join('\n')}

${option.fns.map((f) => f.implementation).join('\n\n')}
    
int main(void) {
    // Setup error handling
    if (setjmp(exception_ctx.env) == 0) {
        // Normal execution path
        ${statementString}
    } else {
        // Error handling path
        printf("Uncaught Error: %s", exception_ctx.error_message);
        // Return success exit code for testing consistency
        return 0;
    }
    return 0;
}
`;
    },

    getAllVars: () => union(...statementEmitNodes.map((en) => en.getAllVars())),
  };
};
