import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

export const blockEmitter: Emitter<ts.Block> = (node, option) => {
  // Raw C statements to inject before this block's own statements (e.g. a
  // function's closure-context setup). Consumed here and NOT forwarded to the
  // child statements / nested blocks (Theme 4: structured closure setup).
  const prependStatements = option.prependStatements ?? [];
  const { prependStatements: _omit, ...childOption } = option;

  // Get the emit nodes for all statements
  const emitNodes = node.statements.map((s) => getEmitNode(s, childOption));

  return {
    emit: () => {
      // Generate the block body - local variables are now properly scoped as C
      // locals. Any prepended setup statements come first, as real statements.
      const statements = [
        ...prependStatements,
        ...emitNodes.map((en) => en.emit()),
      ];
      return `{\n ${statements.join('\n')}\n}`;
    },

    getAllVars: () => union(...emitNodes.map((en) => en.getAllVars())),
  };
};
