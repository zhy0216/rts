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
      // Tagged null. The TYPE-level distinction lives in `tsType2C`, which lowers
      // a null/undefined-typed value to `void *` (never int/double), so null is
      // not conflated with numeric/boolean 0 at the C type level. The literal
      // itself emits `0`, which in C is simultaneously the null pointer constant
      // (valid for the `void *` slot) and a valid int — so it composes whether
      // the surrounding value's lowered type is `void *` or the `int` fallback
      // that a widened `let x = null` receives.
      return '0';
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
