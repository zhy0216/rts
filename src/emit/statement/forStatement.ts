import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, tsType2C, union } from '../helper.ts';

export const forStatementEmitter: Emitter<ts.ForStatement> = (node, option) => {
  const { checker } = option;
  // Special handling for variable declaration initializers
  let initializerEmitNode;
  let initializerString = '';
  let initializerVars = new Set<ts.Identifier>();

  if (node.initializer) {
    if (ts.isVariableDeclarationList(node.initializer)) {
      // Handle variable declaration list (e.g., 'let i = 0')
      const declarations = node.initializer.declarations;
      if (declarations.length > 0) {
        const firstDecl = declarations[0];
        if (ts.isIdentifier(firstDecl.name) && firstDecl.initializer) {
          const varName = firstDecl.name.getText();
          const varType =
            tsType2C(checker.getTypeAtLocation(firstDecl)) || 'int';
          const initializerNode = getEmitNode(firstDecl.initializer, option);
          // Emit as a proper C variable declaration
          initializerString = `${varType} ${varName} = ${initializerNode.emit()}`;
          // Initialize with empty set, then add vars from initializer
          initializerVars = new Set<ts.Identifier>(
            initializerNode.getAllVars()
          );
          // Add the variable to the envRecord to make it available in the scope
          option.envRecord.boundVars.add(firstDecl.name);
          option.envRecord.allVars.add(firstDecl.name);
        }
      }
    } else {
      // For other types of initializers (expressions)
      initializerEmitNode = getEmitNode(node.initializer, option);
      initializerString = initializerEmitNode.emit();
      initializerVars = initializerEmitNode.getAllVars();
    }
  }

  const conditionEmitNode = node.condition
    ? getEmitNode(node.condition, option)
    : undefined;
  const incrementorEmitNode = node.incrementor
    ? getEmitNode(node.incrementor, option)
    : undefined;
  const bodyEmitNode = getEmitNode(node.statement, option);

  return {
    emit: () => {
      const conditionString = conditionEmitNode
        ? conditionEmitNode.emit()
        : '1'; // Default to true if no condition
      const incrementorString = incrementorEmitNode
        ? incrementorEmitNode.emit()
        : '';
      const bodyString = bodyEmitNode.emit();

      return `for(${initializerString}; ${conditionString}; ${incrementorString}) ${bodyString}`;
    },

    getAllVars: () =>
      union(
        initializerVars,
        conditionEmitNode?.getAllVars(),
        incrementorEmitNode?.getAllVars(),
        bodyEmitNode.getAllVars()
      ),
  };
};
