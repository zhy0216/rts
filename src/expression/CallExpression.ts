// import { EmitNode } from "../type";
// import ts from "typescript";
//
// export class CallExpression implements EmitNode {
//   node: ts.CallExpression;
//   checker: ts.TypeChecker;
//   constructor(node: ts.CallExpression, option: { checker: ts.TypeChecker }) {
//     this.node = node;
//     this.checker = option.checker;
//   }
//   emit(): string {
//     if (!ts.isPropertyAccessExpression(this.node.expression))
//       throw new Error(`wrong call node: ${this.node}`);
//     if (this.node.expression.getText() == "console.log") {
//       const argument = this.node.arguments[0];
//       const type = this.checker.getTypeAtLocation(argument);
//       const typeString = this.checker.typeToString(
//         type,
//         this.node.parent,
//         ts.TypeFormatFlags.NoTruncation |
//           ts.TypeFormatFlags.AllowUniqueESSymbolType,
//       );
//
//       console.log(typeString);
//
//       return `
// `;
//     }
//
//     return `not support call expression ${this.node}`;
//   }
// }
