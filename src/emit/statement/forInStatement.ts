import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

/**
 * Emitter for for-in statements
 * In C, we'll implement this by simulating iterating over object properties
 * Since we don't have full object support yet, this will be a simplified version
 */
export const forInStatementEmitter: Emitter<ts.ForInStatement> = (
  node,
  option
) => {
  // The statement being executed in the loop body
  const statementEmitter = getEmitNode(node.statement, option);

  // The object expression being iterated
  const expressionEmitter = getEmitNode(node.expression, option);

  // The initializer (usually a variable declaration for the property name)
  let iterationVarName: string;

  if (ts.isVariableDeclarationList(node.initializer)) {
    // Extract variable name from declaration
    const declaration = node.initializer.declarations[0];
    iterationVarName = declaration.name.getText();
  } else if (ts.isExpression(node.initializer)) {
    // If it's an expression (usually an identifier), just use it directly
    iterationVarName = node.initializer.getText();
  } else {
    throw new Error('Unsupported initializer type in for-in statement');
  }

  // Generate a unique ID for this for-in statement to avoid naming conflicts
  const forInId = `for_in_${node.pos}_${node.end}`;

  return {
    emit: () => {
      const expression = expressionEmitter.emit();
      const statement = statementEmitter.emit();

      // In a real implementation, we would iterate through object properties
      // Since we don't have full object support yet, we'll simulate it with a simple example
      // This is a placeholder implementation that will be improved when we add object support
      return `
{
  // For-in loop implementation (simplified)
  // Create a temporary array of property names
  char* ${forInId}_props[] = {"length", "toString", "valueOf", NULL};
  
  // Iterate over the property names
  for (int ${forInId}_i = 0; ${forInId}_props[${forInId}_i] != NULL; ${forInId}_i++) {
    // Assign current property name to iteration variable
    char* ${iterationVarName} = ${forInId}_props[${forInId}_i];
    
    // Execute the loop body
    ${statement}
  }
}`;
    },

    getAllVars: () => {
      const expressionVars = expressionEmitter.getAllVars();
      const statementVars = statementEmitter.getAllVars();

      return union(expressionVars, statementVars);
    },
  };
};
