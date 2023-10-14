import { Statement } from ".";


export class EmptyStatement implements Statement{
    emit = () => ""
}