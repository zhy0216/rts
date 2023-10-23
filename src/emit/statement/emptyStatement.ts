import { Emitter } from "../../type";
import ts from "typescript";

export const emptyStatementEmitter: Emitter<ts.EmptyStatement> = () => ({
  emit: () => "",
});
