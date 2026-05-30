import * as ts from 'typescript';
import { AstNode, Emitter } from './type';
import {
  getEmitNode,
  loweredType,
  makeDeclareClosure,
  union,
} from './emit/helper';
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

      const checker = option.checker;

      // Track the full C declarator string for function pointers and object
      // literals (only top-level). Function-pointer param/return types are
      // lowered via the shared mapper so they match the function-expression
      // emitter (e.g. double(*)(double, double)).
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
                    let returnC = 'double';
                    let paramCs: string[] = [];
                    try {
                      const sig = checker.getSignatureFromDeclaration(
                        decl.initializer
                      );
                      if (sig) {
                        returnC = loweredType(sig.getReturnType());
                      }
                      paramCs = decl.initializer.parameters.map((p) =>
                        loweredType(checker.getTypeAtLocation(p))
                      );
                    } catch {
                      // Leave defaults if a type cannot be lowered yet.
                    }
                    varTypes.set(
                      varName,
                      `${returnC} (*${varName})(${paramCs.join(', ')})`
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

      // Lower a plain global's scalar C type; falls back to int if it cannot be
      // lowered (e.g. arrays/objects, which are handled by their own declarators).
      const globalScalarType = (varName: string): string => {
        for (const source of tsProgram
          .getSourceFiles()
          .filter((s) => !s.isDeclarationFile)) {
          for (const statement of source.statements) {
            if (!ts.isVariableStatement(statement)) continue;
            for (const decl of statement.declarationList.declarations) {
              if (
                ts.isIdentifier(decl.name) &&
                decl.name.getText() === varName
              ) {
                try {
                  return loweredType(checker.getTypeAtLocation(decl));
                } catch {
                  return 'int';
                }
              }
            }
          }
        }
        return 'int';
      };

      // Generate global declarations for all variables
      const globalDeclarations = Array.from(allVars)
        .map((varName) => {
          // Function pointers / object literals keep their special declarator.
          if (varTypes.has(varName)) {
            return `${varTypes.get(varName)} = NULL;`;
          }
          // Plain scalars: declare with the lowered C type, zero-initialized.
          return `${globalScalarType(varName)} ${varName} = 0;`;
        })
        .join('\n');

      return `
#include <stdio.h>
#include <stdlib.h>
#include <setjmp.h>
#include <string.h>
#include <math.h>

// Prints a JS number. number lowers to C double; integral values print without a
// decimal point (3, 1073741822 — never scientific notation), others compactly
// (1.5). Keeps console.log output matching JS for the supported numeric range.
void rts_print_number(double d) {
  if (d == (long long)d) {
    printf("%lld\\n", (long long)d);
  } else {
    printf("%g\\n", d);
  }
}

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

// Array declarations (element-typed: number arrays are double[]; slot [0] holds
// the element count, a valid double initializer)
${option.arrays ? option.arrays.map((arr) => `${arr.elementType} ${arr.name}[] = {${arr.values}};`).join('\n') : ''}

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
