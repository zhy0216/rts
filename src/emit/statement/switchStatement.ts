import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

type CaseClauseEmitter = {
  type: 'case';
  expression: ReturnType<typeof getEmitNode>;
  statements: ReturnType<typeof getEmitNode>[];
};

type DefaultClauseEmitter = {
  type: 'default';
  statements: ReturnType<typeof getEmitNode>[];
};

type ClauseEmitter = CaseClauseEmitter | DefaultClauseEmitter;

export const switchStatementEmitter: Emitter<ts.SwitchStatement> = (
  node,
  option
) => {
  const expressionEmitter = getEmitNode(node.expression, option);

  // Process all clauses
  const clauseEmitters = node.caseBlock.clauses.map((clause): ClauseEmitter => {
    if (ts.isCaseClause(clause)) {
      const caseExpressionEmitter = getEmitNode(clause.expression, option);
      const statementsEmitters = clause.statements.map((stmt) =>
        getEmitNode(stmt, option)
      );

      return {
        type: 'case',
        expression: caseExpressionEmitter,
        statements: statementsEmitters,
      };
    } else if (ts.isDefaultClause(clause)) {
      const statementsEmitters = clause.statements.map((stmt) =>
        getEmitNode(stmt, option)
      );

      return {
        type: 'default',
        statements: statementsEmitters,
      };
    }

    // This code is technically unreachable since we've checked for both case and default clauses,
    // but TypeScript needs this for type narrowing
    const _exhaustiveCheck: never = clause;
    throw new Error(`Unsupported clause type`);
  });

  return {
    emit: () => {
      const switchExpression = expressionEmitter.emit();
      const clausesCode = clauseEmitters
        .map((clause) => {
          if (clause.type === 'case') {
            const caseExpression = clause.expression.emit();
            const statementsCode = clause.statements
              .map((stmt) => stmt.emit())
              .join('\n    ');

            return `case ${caseExpression}:\n    ${statementsCode || '/* empty */'}`;
          } else if (clause.type === 'default') {
            const statementsCode = clause.statements
              .map((stmt) => stmt.emit())
              .join('\n    ');

            return `default:\n    ${statementsCode || '/* empty */'}`;
          }

          return '';
        })
        .join('\n  ');

      return `switch (${switchExpression}) {\n  ${clausesCode}\n}`;
    },

    getAllVars: () => {
      const expressionVars = expressionEmitter.getAllVars();
      const clausesVarsSets = clauseEmitters.map((clause) => {
        if (clause.type === 'case') {
          // Combine the variables from the case expression and all statements
          const caseExpressionVars = clause.expression.getAllVars();
          const statementsVars = clause.statements.map((stmt) =>
            stmt.getAllVars()
          );
          return union(caseExpressionVars, ...statementsVars);
        } else {
          // For default clause, just combine variables from all statements
          return union(...clause.statements.map((stmt) => stmt.getAllVars()));
        }
      });

      return union(expressionVars, ...clausesVarsSets);
    },
  };
};
