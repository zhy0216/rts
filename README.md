# rts
rts is a restricted subset of TypeScript, where the type of every identifier and expression must be determined at
compile time and cannot be changed during the runtime. By restricted, we mean, dynamic typing or any mechanism that
allows the change of type at runtime are not allowed in this subset.

The workflow of rts is as follows:

1. **Scanner:** takes in the TypeScript code and converts it into tokens
2. **Parser:** constructs the abstract syntax tree (AST) from these tokens
3. **Binder:** assigns semantic meaning to the various components of AST
4. **Checker:** checks if all types are correctly used according to the rules of the TypeScript language
5. **Emitter:** is responsible for generating the final code

The scanner and parser stage uses TypeScript's existing implementation, whereas a custom binder and emitter are used
for rts.

## How To Guides // TODO
For detailed instructions and tutorials on how to use rts, refer to our [how-to-guides](https://diataxis.fr/how-to-guides/).

Please note that while rts adheres to the TypeScript’s typing rules,
there may be certain features or concepts from TypeScript that are not included
in this subset due to its restrictiveness, which aims at reducing complexity
and ensuring stronger statically typed codes.

## Acknowledgments
- [ts2c](https://github.com/andrei-markeev/ts2c): ts2c's great work in transpiling TypeScript to C offered me practical
insight into how to achieve a similar feat with rts.
- [ts-ast-viewer](https://ts-ast-viewer.com/): ts-ast-viewer is an incredibly helpful tool that visually
 represents TypeScript or JavaScript code as an AST for better understanding and manipulation.
- [thinscript](https://github.com/evanw/thinscript): thinscript inspired me, particularly in the design of low-level
aspects of the language and exploring the possibilities of a strongly-typed, portable language.
