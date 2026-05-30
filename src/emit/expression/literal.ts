import { Emitter } from '../../type';
import ts, { SyntaxKind } from 'typescript';

export const literalEmitter: Emitter<
  ts.NumericLiteral | ts.BooleanLiteral | ts.StringLiteral | ts.NullLiteral
> = (node) => ({
  emit: () => {
    if (node.kind === SyntaxKind.TrueKeyword) {
      return '1';
    }

    if (node.kind === SyntaxKind.FalseKeyword) {
      return '0';
    }

    if (node.kind === SyntaxKind.NullKeyword) {
      return '0'; // In C, NULL is often represented as 0
    }

    // Numeric literals lower to C `double`. A bare integer literal like `6` is an
    // `int` token in C, which would make `5 / 2` integer-divide to `2`; appending
    // `.0` keeps the source value identical while forcing double arithmetic
    // (so `5 / 2` is `2.5`). Literals that already have a `.`, exponent, or a
    // hex/binary/octal/bigint form are left untouched.
    if (node.kind === SyntaxKind.NumericLiteral) {
      const text = node.getText();
      const isPlainInteger = /^[0-9]+$/.test(text);
      return isPlainInteger ? `${text}.0` : text;
    }

    return node.getText();
  },
  getAllVars: () => new Set(),
});
