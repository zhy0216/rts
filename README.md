# rts
rts is a restricted subset of TypeScript, where the type of every identifier and expression must be determined at
compile time and cannot be changed during the runtime. By restricted, we mean, dynamic typing or any mechanism that
allows the change of type at runtime are not allowed in this subset.

The workflow of rts is the same as TypeScript:

Scanner -> Parser -> Binder -> Checker -> Emitter

The scanner and parser stage uses TypeScript's existing implementation, whereas a custom binder and emitter are used
for rts.

Please note that while rts adheres to the TypeScript’s typing rules,
there may be certain features or concepts from TypeScript that are not included
in this subset due to its restrictiveness, which aims at reducing complexity
and ensuring stronger statically typed codes.

## Acknowledgments
- [ts2c](https://github.com/andrei-markeev/ts2c)
- [ts-ast-viewer](https://ts-ast-viewer.com/)
- [thinscript](https://github.com/evanw/thinscript)