import { Emitter } from '../../type';
import ts from 'typescript';
import { getEmitNode, loweredType, union } from '../helper';

/**
 * Emitter for object literal expressions (Theme 2).
 *
 * An object literal lowers to a C compound literal of its named struct type:
 *   { a: 1, b: 2 }  ->  ((Obj_a_b){ .a = 1.0, .b = 2.0 })
 * The struct typedef itself is emitted in the C preamble (program.ts) from the
 * shared struct registry, which `loweredType` populates here.
 */
export const objectLiteralEmitter: Emitter<ts.ObjectLiteralExpression> = (
  node,
  option
) => {
  const { checker } = option;

  // Property name -> its value emitter, in declaration order.
  const propertyEmitters = node.properties
    .map((property) => {
      if (ts.isPropertyAssignment(property)) {
        return {
          name: property.name.getText(),
          emitter: getEmitNode(property.initializer, option),
        };
      }
      // Only plain property assignments are supported.
      return null;
    })
    .filter(
      (
        prop
      ): prop is { name: string; emitter: ReturnType<typeof getEmitNode> } =>
        prop !== null
    );

  return {
    emit: () => {
      // Lower the literal's own type to its named struct (registers the shape so
      // program.ts emits the matching typedef).
      const structName = loweredType(checker.getTypeAtLocation(node));

      const designated = propertyEmitters
        .map((prop) => `.${prop.name} = ${prop.emitter.emit()}`)
        .join(', ');

      // C99 compound literal, parenthesised so it composes as an expression.
      return `((${structName}){ ${designated} })`;
    },

    getAllVars: () => {
      return union(
        ...propertyEmitters.map((prop) => prop.emitter.getAllVars())
      );
    },
  };
};
