import { Emitter } from '../../type';
import ts, { SyntaxKind } from 'typescript';
import { getEmitNode, isCompoundAssignment, union } from '../helper.ts';

const getOperator = (operator: ts.BinaryOperatorToken): string => {
  switch (operator.kind) {
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return '==';
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return '!=';
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      // Unsigned right shift in C
      // Implementing as a combination of right shift and bitwise operations
      // Note: this is simplified and would need more accurate handling for full implementation
      return '>>'; // We'll handle the unsigned conversion in the emit method
    default:
      return operator.getText();
  }
};

// True for the integer-only operators (bitwise and signed shifts), in either
// their standalone (`&`) or compound-assignment (`&=`) form. number lowers to C
// `double`, so these need their operands cast to `int` before the C operator is
// valid.
const isBitwiseOrShiftKind = (kind: ts.SyntaxKind): boolean => {
  switch (kind) {
    case ts.SyntaxKind.AmpersandToken:
    case ts.SyntaxKind.BarToken:
    case ts.SyntaxKind.CaretToken:
    case ts.SyntaxKind.LessThanLessThanToken:
    case ts.SyntaxKind.GreaterThanGreaterThanToken:
    case ts.SyntaxKind.AmpersandEqualsToken:
    case ts.SyntaxKind.BarEqualsToken:
    case ts.SyntaxKind.CaretEqualsToken:
    case ts.SyntaxKind.LessThanLessThanEqualsToken:
    case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      return true;
    default:
      return false;
  }
};

// Maps compound assignment operators to their simple binary operator equivalent
const compoundToSimpleOperator = (kind: ts.SyntaxKind): string => {
  switch (kind) {
    case ts.SyntaxKind.PlusEqualsToken:
      return '+';
    case ts.SyntaxKind.MinusEqualsToken:
      return '-';
    case ts.SyntaxKind.AsteriskEqualsToken:
      return '*';
    case ts.SyntaxKind.SlashEqualsToken:
      return '/';
    case ts.SyntaxKind.PercentEqualsToken:
      return '%';
    case ts.SyntaxKind.LessThanLessThanEqualsToken:
      return '<<';
    case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      return '>>';
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      // Handled separately in the emitter (needs an (unsigned int) cast); '>>'
      // is the closest valid C fallback so this never emits invalid '>>>'.
      return '>>';
    case ts.SyntaxKind.AmpersandEqualsToken:
      return '&';
    case ts.SyntaxKind.CaretEqualsToken:
      return '^';
    case ts.SyntaxKind.BarEqualsToken:
      return '|';
    default:
      return '='; // Default to simple assignment
  }
};

export const binaryExpressionEmitter: Emitter<ts.BinaryExpression> = (
  node,
  option
) => {
  const leftEmitNode = getEmitNode(node.left, option);
  const rightEmitNode = getEmitNode(node.right, option);

  return {
    emit: () => {
      const left = leftEmitNode.emit();
      const right = rightEmitNode.emit();
      const needParent = ts.isBinaryExpression(node.parent);

      // Handle comma operator
      if (node.operatorToken.kind === ts.SyntaxKind.CommaToken) {
        // Use C's comma operator directly
        const expressionString = `(${left}, ${right})`;
        return expressionString;
      }

      // Handle compound assignments. number lowers to C `double`, so the
      // integer-only operators (`%`, bitwise, shifts) cannot apply directly: we
      // lower them through an `int`/`unsigned int` cast and store the result back
      // as a `double`.
      if (isCompoundAssignment(node.operatorToken.kind)) {
        // Unsigned right shift assignment (>>>=): cast double->int FIRST (avoids
        // UB on out-of-range doubles), then to unsigned for JS uint32 semantics.
        if (
          node.operatorToken.kind ===
          ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
        ) {
          const expressionString = `${left} = (double)((unsigned int)(int)(${left}) >> (int)(${right}))`;
          return needParent ? `(${expressionString})` : expressionString;
        }
        // Bitwise / signed-shift compound assignments need integer operands.
        if (isBitwiseOrShiftKind(node.operatorToken.kind)) {
          const operator = compoundToSimpleOperator(node.operatorToken.kind);
          const expressionString = `${left} = (double)((int)(${left}) ${operator} (int)(${right}))`;
          return needParent ? `(${expressionString})` : expressionString;
        }
        // Modulo assignment: `%` is invalid on doubles in C -> fmod.
        if (node.operatorToken.kind === ts.SyntaxKind.PercentEqualsToken) {
          const expressionString = `${left} = fmod(${left}, ${right})`;
          return needParent ? `(${expressionString})` : expressionString;
        }
        // Arithmetic compound assignment (+= -= *= /=) maps directly on doubles.
        const operator = compoundToSimpleOperator(node.operatorToken.kind);
        const expressionString = `${left} = ${left} ${operator} ${right}`;
        return needParent ? `(${expressionString})` : expressionString;
      }

      // Unsigned right shift operator (>>>): cast double->int first, then to
      // unsigned int for JS uint32 semantics.
      if (
        node.operatorToken.kind ===
        ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken
      ) {
        const expressionString = `((unsigned int)(int)(${left}) >> (int)(${right}))`;
        return needParent ? `(${expressionString})` : expressionString;
      }

      // Bitwise / signed-shift operators need integer operands (doubles are not
      // valid for `& | ^ << >>` in C): lower to ((int)(left) OP (int)(right)).
      if (isBitwiseOrShiftKind(node.operatorToken.kind)) {
        const expressionString = `((int)(${left}) ${getOperator(
          node.operatorToken
        )} (int)(${right}))`;
        return needParent ? `(${expressionString})` : expressionString;
      }

      // Modulo: `%` is invalid on doubles in C -> fmod(a, b).
      if (node.operatorToken.kind === ts.SyntaxKind.PercentToken) {
        const expressionString = `fmod(${left}, ${right})`;
        return needParent ? `(${expressionString})` : expressionString;
      }

      const expressionString = `${left} ${getOperator(
        node.operatorToken
      )} ${right}`;

      return needParent ? `(${expressionString})` : expressionString;
    },
    getAllVars: () => {
      if (
        isCompoundAssignment(node.operatorToken.kind) ||
        node.operatorToken.kind === SyntaxKind.EqualsToken
      ) {
        return union(rightEmitNode.getAllVars());
      }
      return union(leftEmitNode.getAllVars(), rightEmitNode.getAllVars());
    },
  };
};
