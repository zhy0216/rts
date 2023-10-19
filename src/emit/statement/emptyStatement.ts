import { Emitter } from "../../type";

export const emptyStatementEmitter: Emitter = () => ({
  emit: () => "",
});
