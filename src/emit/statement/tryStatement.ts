import { Emitter } from "../../type";
import ts from "typescript";
import { getEmitNode, union } from "../helper";

/**
 * Emitter for try-catch-finally statements
 * In C, we'll implement this using setjmp/longjmp for exception handling
 */
export const tryStatementEmitter: Emitter<ts.TryStatement> = (node, option) => {
  const tryBlockEmitter = getEmitNode(node.tryBlock, option);
  
  // Get the catch variable name if it exists
  const catchVarName = node.catchClause?.variableDeclaration?.name.getText();
  
  // Process catch clause if it exists
  const catchClauseEmitter = node.catchClause 
    ? getEmitNode(node.catchClause.block, {
        ...option,
        catchVariable: catchVarName,
      })
    : undefined;
  
  // Process finally block if it exists
  const finallyBlockEmitter = node.finallyBlock 
    ? getEmitNode(node.finallyBlock, option)
    : undefined;
  
  return {
    emit: () => {
      const tryBlock = tryBlockEmitter.emit();
      const catchBlock = catchClauseEmitter?.emit() || "";
      const finallyBlock = finallyBlockEmitter?.emit() || "";
      
      // Generate a unique ID for this try statement to avoid naming conflicts
      const tryId = `try_${node.pos}_${node.end}`;
      
      // Build the try-catch-finally C implementation
      let code = `
{
  // Try-catch-finally block
  int ${tryId}_old_has_error = exception_ctx.has_error;
  char* ${tryId}_old_error_message = exception_ctx.error_message;
  jmp_buf ${tryId}_old_env;
  memcpy(${tryId}_old_env, exception_ctx.env, sizeof(jmp_buf));
  
  // Setup error handling for try block
  if (setjmp(exception_ctx.env) == 0) {
    // Try block
${tryBlock.split('\n').map(line => `    ${line}`).join('\n')}
  } else {
    // Catch block
    ${catchVarName ? 
      `// Store the error message in the catch variable
    char* catch_var_${catchVarName} = exception_ctx.error_message;
    #define ${catchVarName} catch_var_${catchVarName}
    // Reset the error flag since we're handling it
    exception_ctx.has_error = 0;` : 
      '// No catch variable defined'}
${catchBlock.split('\n').map(line => `    ${line}`).join('\n')}
    ${catchVarName ? `#undef ${catchVarName}` : ''}
  }
  
  ${finallyBlock ? `// Finally block\n${finallyBlock.split('\n').map(line => `  ${line}`).join('\n')}` : '// No finally block'}
  
  // Restore previous exception context
  exception_ctx.has_error = ${tryId}_old_has_error;
  exception_ctx.error_message = ${tryId}_old_error_message;
  memcpy(exception_ctx.env, ${tryId}_old_env, sizeof(jmp_buf));
}`;
      
      return code;
    },
    
    getAllVars: () => {
      const tryBlockVars = tryBlockEmitter.getAllVars();
      const catchBlockVars = catchClauseEmitter?.getAllVars() || new Set();
      const finallyBlockVars = finallyBlockEmitter?.getAllVars() || new Set();
      
      return union(tryBlockVars, catchBlockVars, finallyBlockVars);
    },
  };
};
