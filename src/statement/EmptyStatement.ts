import { Statement } from "./types";

export class EmptyStatement implements Statement {
  emit = () => "";
}
