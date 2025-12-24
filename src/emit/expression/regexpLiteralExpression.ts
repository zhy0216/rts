import { Emitter } from '../../type';
import ts from 'typescript';

/**
 * Emitter for regular expression literals
 * This implements JavaScript regular expressions in C
 */
export const regExpLiteralEmitter: Emitter<ts.RegularExpressionLiteral> = (
  node,
  option
) => {
  return {
    emit: () => {
      // In JavaScript, RegExp literals create RegExp objects
      // For our simplified implementation, we'll use a helper function that creates a regexp object

      // Extract the pattern and flags from the regular expression literal
      // The text is in the format /pattern/flags
      const text = node.text;
      const lastSlashIndex = text.lastIndexOf('/');

      // Extract pattern (without slashes) and flags
      const pattern = text.substring(1, lastSlashIndex);
      const flags = text.substring(lastSlashIndex + 1);

      // Generate C code to create a regular expression
      return `rts_create_regexp("${pattern}", "${flags}")`;
    },

    getAllVars: () => {
      // No variables used
      return new Set();
    },
  };
};
