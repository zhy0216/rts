import ts from "typescript";

function printAllChildren(node: ts.Node, depth = 0) {
  console.log(new Array(depth + 1).join("----"), node.kind, node.pos, node.end);
  depth++;
  node.getChildren().forEach((c) => printAllChildren(c, depth));
}

var sourceCode = `
var foo = 123;
`.trim();

var sourceFile = ts.createSourceFile(
  "foo.ts",
  sourceCode,
  ts.ScriptTarget.ES5,
  true,
);
printAllChildren(sourceFile);
