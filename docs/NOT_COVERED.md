I list the features I won't cover here:
* number: JS number is actually a union of int and float. It is not easy to handle this one, so I treat number as int for now. This will change once I implement union type.
* class
* prototype
* this keyword
* label statement: goto is evil
* IIFE (Immediately Invoked Function Expression)

## Declared in 0.0.2 but not yet functional

These have an emitter and a `[x]`/`[~]` history but currently emit a placeholder
that returns a constant (or ignores its input). They are tracked for real
implementation in `docs/roadmad/0.0.3.md` and should not be relied on:

* `typeof` — always returns the string `"number"`
* `in` — always returns 1
* `delete` — always returns 1 (deletes nothing)
* `instanceof` — always returns 1
* `new` — returns a dummy pointer; never runs a constructor
* regular expression literal — returns a dummy pointer; no matching
* `this` — a permanently-NULL global (also listed above as out of scope)
* `for`-`in` — iterates a hardcoded `length`/`toString`/`valueOf` list instead of the object's real keys

Partially working (limited to narrow cases): `try` (no accessible catch binding,
no `finally`), `for`-`of` / array literals (int-only, 0-sentinel terminated),
object literals and property access (flat int fields, not first-class values).
