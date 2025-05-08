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

## Milestones

### 0.0.1 - Core Language Features (Completed)

The first milestone focused on implementing the core language features of rts, including:

#### Statements
- Block statement
- Variable declarations with `let`
- Empty statement
- Expression statement
- Control flow: `if`/`else`, `while`, `for`, `continue`, `break`
- `return` statement
- Function definition

#### Expressions
- Primary expressions (identifiers, literals, grouping)
- Left-hand-side expressions (function calls, argument lists, function expressions)
- Postfix and prefix expressions (increment/decrement)
- Unary operators (`+`, `-`, `~`, `!`)
- Binary operators (arithmetic, comparison, equality, bitwise, logical)
- Conditional (ternary) operator
- Compound assignment operators

#### Types
- Basic types (number, boolean, string)
- Function types
- Null type

### 0.0.2 - Advanced Language Features (Completed)

The second milestone expanded on the core features by implementing more advanced JavaScript language features:

#### Statements
- Enhanced control flow: `do-while`, `switch`, `try-catch-finally`
- Extended loop constructs: `for-of`, `for-in`
- `throw` statement for exception handling

#### Expressions
- Object system: `this` keyword, property accessors
- Object and array literals/initializers
- Operators: `typeof`, `delete`, `void`, `instanceof`, `in`, `new`
- Regular expression literals
- Comma operator

For a detailed list of implemented features, see [docs/roadmad/0.0.1.md](docs/roadmad/0.0.1.md) and [docs/roadmad/0.0.2.md](docs/roadmad/0.0.2.md).

## Acknowledgments
- [ts2c](https://github.com/andrei-markeev/ts2c)
- [ts-ast-viewer](https://ts-ast-viewer.com/)
- [thinscript](https://github.com/evanw/thinscript)