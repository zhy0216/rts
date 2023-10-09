import ts, { BinaryExpression, SyntaxKind } from "typescript";
import { Visitor } from "./abstractVisitor";

export const nodeMap: Partial<Record<SyntaxKind, Visitor>> = {
  [SyntaxKind.BinaryExpression]: {
    beforeVisit: (tsnode: ts.Node) => {
      const node = tsnode as ts.BinaryExpression;
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.PlusToken: {
        }
      }
    },
  },

  [SyntaxKind.NumericLiteral]: {
    beforeVisit: (tsnode: ts.Node) => {},
  },
};
function visit(node: ts.Node) {
  nodeMap?.[node.kind]?.beforeVisit?.(node);
  node.forEachChild(visit);
  nodeMap?.[node.kind]?.afterVisit?.(node);
}
