import ts from "typescript";

export interface Visitor {
  beforeVisit?: (node: ts.Node) => void;

  afterVisit?: (node: ts.Node) => void;
}

export abstract class AstVisitor implements Visitor {
  abstract beforeVisit(node: ts.Node): void;

  abstract afterVisit(node: ts.Node): void;
}
