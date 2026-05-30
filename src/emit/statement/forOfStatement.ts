import { Emitter } from '../../type';
import ts from 'typescript';
import { arrayElementCType, getEmitNode, union } from '../helper';

/**
 * Emitter for for-of statements
 * In C, we'll implement this using a loop over array elements
 */
export const forOfStatementEmitter: Emitter<ts.ForOfStatement> = (
  node,
  option
) => {
  const { checker } = option;
  // The statement being executed on each iteration
  const statementEmitter = getEmitNode(node.statement, option);

  // The expression being iterated (should be an array-like object)
  const expressionEmitter = getEmitNode(node.expression, option);

  // The C element type of the iterated array (number arrays -> double), so the
  // pointer/element declarations match the array's storage.
  const elementCType = arrayElementCType(
    checker.getTypeAtLocation(node.expression)
  );

  // The initializer (usually a variable declaration)
  let iterationVarName: string;

  if (ts.isVariableDeclarationList(node.initializer)) {
    // Extract variable name from declaration
    const declaration = node.initializer.declarations[0];
    iterationVarName = declaration.name.getText();
  } else if (ts.isExpression(node.initializer)) {
    // If it's an expression (usually an identifier), just use it directly
    iterationVarName = node.initializer.getText();
  } else {
    throw new Error('Unsupported initializer type in for-of statement');
  }

  // Generate a unique ID for this for-of statement to avoid naming conflicts
  const forOfId = `for_of_${node.pos}_${node.end}`;

  return {
    emit: () => {
      // We need to handle both direct array literals and array variables differently
      const expression = expressionEmitter.emit();
      const statement = statementEmitter.emit();

      // Handle the iteration through the array
      return `
{
  // For-of loop implementation
  ${elementCType}* ${forOfId}_array_ptr = ${expression};
  // The element count is stored in slot [0]; elements start at index 1.
  int ${forOfId}_array_size = (int)${forOfId}_array_ptr[0];

  // Iterate over each element in the array
  for (int ${forOfId}_index = 0; ${forOfId}_index < ${forOfId}_array_size; ${forOfId}_index++) {
    // Get the current element
    ${elementCType} ${iterationVarName} = ${forOfId}_array_ptr[${forOfId}_index + 1];

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
