import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, isLowerableObjectType, union } from '../helper';

/**
 * Emitter for for-in statements (Theme 2).
 *
 * The iterated object's property names are statically known from its type, so we
 * emit a loop over the ACTUAL field-name string literals (in declaration order)
 * rather than a hardcoded {"length","toString","valueOf"} list. The iteration
 * variable is a `char*` key, matching JS `for (const k in obj)` semantics.
 */
export const forInStatementEmitter: Emitter<ts.ForInStatement> = (
  node,
  option
) => {
  const { checker } = option;
  const statementEmitter = getEmitNode(node.statement, option);
  const expressionEmitter = getEmitNode(node.expression, option);

  // The iteration variable (the key name).
  let iterationVarName: string;
  if (ts.isVariableDeclarationList(node.initializer)) {
    iterationVarName = node.initializer.declarations[0].name.getText();
  } else if (ts.isExpression(node.initializer)) {
    iterationVarName = node.initializer.getText();
  } else {
    throw new Error('Unsupported initializer type in for-in statement');
  }

  // Statically resolve the iterated object's property names (declaration order).
  const objectType = checker.getTypeAtLocation(node.expression);
  const keyNames = isLowerableObjectType(objectType)
    ? objectType.getProperties().map((sym) => sym.getName())
    : [];

  const forInId = `for_in_${node.pos}_${node.end}`;

  return {
    emit: () => {
      // Evaluate the iterated expression for any side effects, then enumerate the
      // statically-known keys. (The keys themselves come from the type, so the
      // value is only emitted to preserve evaluation semantics.)
      const expression = expressionEmitter.emit();
      const statement = statementEmitter.emit();

      const keyLiterals = keyNames.map((k) => `"${k}"`).join(', ');
      // A non-empty initializer list (NULL terminator) keeps the array valid even
      // when the object has no own enumerable keys.
      const arrayInit = keyLiterals ? `${keyLiterals}, NULL` : 'NULL';

      return `
{
  // For-in loop: keys are the iterated object's statically-known property names.
  (void)(${expression});
  char* ${forInId}_props[] = {${arrayInit}};
  for (int ${forInId}_i = 0; ${forInId}_props[${forInId}_i] != NULL; ${forInId}_i++) {
    char* ${iterationVarName} = ${forInId}_props[${forInId}_i];
    ${statement}
  }
}`;
    },

    getAllVars: () => {
      return union(
        expressionEmitter.getAllVars(),
        statementEmitter.getAllVars()
      );
    },
  };
};
