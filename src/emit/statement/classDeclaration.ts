import { ClassDeclaration, Emitter, EmitterOption } from '../../type';
import ts from 'typescript';
import {
  getClassRegistry,
  getEmitNode,
  loweredType,
  nextClassTypeId,
  union,
} from '../helper.ts';

// ---------------------------------------------------------------------------
// Class declaration -> C struct + standalone ctor/method functions (Theme 5).
//
// `class C { x: number; constructor(a){ this.x = a } inc(){ ... } }` lowers to:
//   typedef struct Cls_C { int __type_id; double x; } Cls_C;   (program.ts)
//   Cls_C* Cls_C__ctor(double a) {
//     Cls_C* self = (Cls_C*)malloc(sizeof(Cls_C));
//     self->__type_id = <id>;
//     <field initializers>; <ctor body with this=self>;
//     return self;
//   }
//   double Cls_C_inc(Cls_C* self) { <body with this=self> }
//
// The struct itself (the typedef) is emitted from the program preamble by
// iterating the class registry; here we register the class (so type lowering can
// turn an instance type into `Cls_C *`) and push the ctor + each method into
// option.fns, exactly like functionDeclareEmitter does for free functions.
//
// FLAT MODEL ONLY: no inheritance / super / prototype chain (see NOT_COVERED.md).
// The receiver parameter is named `self` and bound to `this` via option.thisName.
// ---------------------------------------------------------------------------

const RECEIVER = 'self';

export const classDeclarationEmitter: Emitter<ts.ClassDeclaration> = (
  node,
  option
) => {
  const { checker, fns } = option;
  const tsName = node.name!.getText();
  const cName = `Cls_${tsName}`;

  // Register the class up-front (at construction time) so that any later type
  // lowering of an instance type (e.g. a `new C()` local, a method receiver)
  // resolves to `Cls_C *`. Reuse an existing registration if the same class is
  // visited twice within one run.
  const registry = getClassRegistry();
  let entry: ClassDeclaration | undefined = registry.get(tsName);
  if (!entry) {
    // Instance fields: property declarations in source order. Each field's C
    // type is lowered via the shared mapper. (Methods/ctor are not fields.)
    const fields: { name: string; cType: string }[] = [];
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && ts.isIdentifier(member.name)) {
        const fieldType = checker.getTypeAtLocation(member);
        fields.push({
          name: member.name.getText(),
          cType: loweredType(fieldType),
        });
      }
    }

    const methods = new Set<string>();
    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
        methods.add(member.name.getText());
      }
    }

    entry = {
      tsName,
      cName,
      typeId: nextClassTypeId(),
      fields,
      methods,
    };
    registry.set(tsName, entry);
  }

  const typeId = entry.typeId;

  // Collect the constructor and method member nodes so we can emit their bodies.
  let ctorNode: ts.ConstructorDeclaration | undefined;
  const methodNodes: ts.MethodDeclaration[] = [];
  for (const member of node.members) {
    if (ts.isConstructorDeclaration(member)) {
      ctorNode = member;
    } else if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
      methodNodes.push(member);
    }
  }

  // Field initializers written on the property declarations themselves (e.g.
  // `x: number = 0`). Applied inside the constructor right after the type tag,
  // before the explicit constructor body runs.
  const fieldInitMembers = node.members.filter(
    (m): m is ts.PropertyDeclaration =>
      ts.isPropertyDeclaration(m) &&
      ts.isIdentifier(m.name) &&
      m.initializer !== undefined
  );

  // Emit the constructor body's statements with `this` bound to `self`. The body
  // emit nodes are built eagerly so their nested function side effects (pushing
  // to fns) happen during the single emit pass below.
  const memberOption: EmitterOption = { ...option, thisName: RECEIVER };

  const fieldInitEmitters = fieldInitMembers.map((m) => ({
    name: (m.name as ts.Identifier).getText(),
    init: getEmitNode(m.initializer!, memberOption),
  }));

  const ctorParams = ctorNode ? ctorNode.parameters : [];
  const ctorParamStr = ctorParams
    .map(
      (p) => `${loweredType(checker.getTypeAtLocation(p))} ${p.name.getText()}`
    )
    .join(', ');
  const ctorBodyEmitters = ctorNode?.body
    ? ctorNode.body.statements.map((s) => getEmitNode(s, memberOption))
    : [];

  // Each method: lower return type + params, emit body with this=self.
  const methodPlans = methodNodes.map((m) => {
    const methodName = (m.name as ts.Identifier).getText();
    const sig = checker.getSignatureFromDeclaration(m);
    const returnC = sig
      ? loweredType(checker.getReturnTypeOfSignature(sig))
      : 'void';
    const params = m.parameters
      .map(
        (p) =>
          `${loweredType(checker.getTypeAtLocation(p))} ${p.name.getText()}`
      )
      .join(', ');
    const paramPrefix = `${cName}* ${RECEIVER}`;
    const fullParams = params ? `${paramPrefix}, ${params}` : paramPrefix;
    const bodyEmitters = m.body
      ? m.body.statements.map((s) => getEmitNode(s, memberOption))
      : [];
    return {
      declare: `${returnC} ${cName}_${methodName}(${fullParams})`,
      bodyEmitters,
    };
  });

  return {
    emit: () => {
      // --- constructor ---
      const ctorDeclare = `${cName}* ${cName}__ctor(${ctorParamStr})`;
      const ctorStatements: string[] = [];
      ctorStatements.push(
        `${cName}* ${RECEIVER} = (${cName}*)malloc(sizeof(${cName}));`
      );
      ctorStatements.push(`${RECEIVER}->__type_id = ${typeId};`);
      for (const f of fieldInitEmitters) {
        ctorStatements.push(`${RECEIVER}->${f.name} = ${f.init.emit()};`);
      }
      for (const b of ctorBodyEmitters) {
        ctorStatements.push(b.emit());
      }
      ctorStatements.push(`return ${RECEIVER};`);
      const ctorImpl = `${ctorDeclare} {\n${ctorStatements.join('\n')}\n}`;
      fns.push({ declare: ctorDeclare + ';', implementation: ctorImpl });

      // --- methods ---
      for (const m of methodPlans) {
        const bodyStr = m.bodyEmitters.map((b) => b.emit()).join('\n');
        fns.push({
          declare: m.declare + ';',
          implementation: `${m.declare} {\n${bodyStr}\n}`,
        });
      }

      // A class declaration contributes no inline text at its source position.
      return '';
    },
    getAllVars: () =>
      union(
        ...fieldInitEmitters.map((f) => f.init.getAllVars()),
        ...ctorBodyEmitters.map((b) => b.getAllVars()),
        ...methodPlans.flatMap((m) => m.bodyEmitters.map((b) => b.getAllVars()))
      ),
  };
};
