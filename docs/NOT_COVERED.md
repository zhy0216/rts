I list the features I won't cover here:
* prototype chain / inheritance (`extends`, `super`): rts ships only a flat class model (own fields + methods). See `docs/roadmad/0.0.3.md` Theme 5.
* prototype manipulation
* label statement: goto is evil
* IIFE (Immediately Invoked Function Expression)
* first-class function values: a function-typed value stored in a variable, passed as an argument, or **returned** (an escaping closure) has no C representation yet and throws `not support`. In-place nested closures that capture and mutate outer locals DO work (Theme 4).

## Still stubbed / not yet functional

These emit a placeholder that returns a constant (or ignores its input) and should not be relied on:

* `in` operator — `rts_has_property` always returns 1
* `delete` — always returns 1 (deletes nothing)
* regular expression literal — returns a dummy pointer; no matching

## Implemented in 0.0.3 (were stubs in 0.0.2)

* `number` — lowered to C `double` (float literals like `1.5` are no longer truncated); integer-valued numbers still print without a decimal
* `typeof` — returns the operand's static type name, resolved at compile time
* `instanceof` — real per-class `__type_id` tag comparison (for a class right-hand side)
* `new` — allocates (`malloc`) and runs the constructor for classes
* `this` — bound to the method/constructor receiver pointer inside class members
* `for`-`in` — iterates the object's real keys
* objects — first-class by-value C structs (pass / return / store; property read **and** write)
* arrays — length-carrying (element count in slot `[0]`); a real `0` element no longer truncates iteration
