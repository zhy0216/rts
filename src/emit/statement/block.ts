import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, union } from '../helper';

export const blockEmitter: Emitter<ts.Block> = (node, option) => {
  // Get the emit nodes for all statements
  const emitNodes = node.statements.map((s) => getEmitNode(s, option));

  return {
    emit: () => {
      // Generate the block body - local variables are now properly scoped as C locals
      return `{\n ${emitNodes.map((en) => en.emit()).join('\n')}\n}`;
    },

    getAllVars: () => union(...emitNodes.map((en) => en.getAllVars())),
  };
};
