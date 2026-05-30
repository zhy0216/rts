import { Emitter } from '../../type';
import ts from 'typescript';
import { classDeclOfType, getEmitNode, union } from '../helper';

/**
 * Emitter for `new` expressions.
 *
 * Theme 5: when the constructed expression is a user-defined class, emit a call
 * to its generated constructor `Cls_<Name>__ctor(args)` (which mallocs, sets the
 * type tag, applies field initializers + the constructor body, and returns the
 * instance pointer). For any other constructible (host types), fall back to the
 * rts_new(...) stub.
 */
export const newEmitter: Emitter<ts.NewExpression> = (node, option) => {
  const { checker } = option;
  // Get the expression being constructed (the constructor)
  const expressionEmitter = getEmitNode(node.expression, option);

  // Process the arguments to the constructor
  const argumentEmitters = node.arguments
    ? node.arguments.map((arg) => getEmitNode(arg, option))
    : [];

  // Resolve the class being constructed. The expression is the constructor (a
  // class value); its symbol's declaration tells us if it is a user class. We
  // also probe the resulting instance type as a fallback.
  const resolveClassCName = (): string | undefined => {
    const exprSymbol = checker.getSymbolAtLocation(node.expression);
    const exprDecl =
      exprSymbol?.valueDeclaration ?? exprSymbol?.getDeclarations()?.[0];
    if (exprDecl && ts.isClassDeclaration(exprDecl) && exprDecl.name) {
      return `Cls_${exprDecl.name.getText()}`;
    }
    // Fallback: the type of `new C()` is the instance type of class C.
    const instanceType = checker.getTypeAtLocation(node);
    const decl = classDeclOfType(instanceType);
    if (decl && decl.name) {
      return `Cls_${decl.name.getText()}`;
    }
    return undefined;
  };

  return {
    emit: () => {
      const args = argumentEmitters.map((arg) => arg.emit()).join(', ');
      const classCName = resolveClassCName();
      if (classCName) {
        return `${classCName}__ctor(${args})`;
      }

      // Non-class constructible: keep the existing stub behaviour.
      const expression = expressionEmitter.emit();
      if (argumentEmitters.length > 0) {
        return `rts_new(${expression}, ${args})`;
      }
      return `rts_new(${expression})`;
    },

    getAllVars: () => {
      return union(...argumentEmitters.map((arg) => arg.getAllVars()));
    },
  };
};
