# Architecture

## Scope

The runtime has one responsibility: merge two JavaScript values without
mutating either input while enforcing a small set of security invariants.

## Merge state

Each top-level merge creates isolated state containing:

- normalized options;
- a target/source pair memo for recursive merges;
- a clone memo for repeated source references;
- the cumulative enumerable-key count;
- callback depth for compatibility hooks.

No state is shared between calls.

## Traversal

`mergeInternal` dispatches by array shape:

- array plus array uses the configured array strategy;
- mismatched array/object shape clones the source;
- object plus object copies target-only keys and then merges source keys.

Accepted values are written with `Object.defineProperty` as own enumerable data
properties. This avoids invoking legacy object prototype setters during writes.

## Security invariants

Before reading an enumerable property value, traversal checks:

1. the key is not `__proto__`, `prototype`, or `constructor`;
2. the target does not expose that property only through an inherited or
   non-enumerable slot;
3. configured depth and key budgets have not been exceeded.

Both source and target keys pass the dangerous-key filter. Rejected getters are
never invoked.

## Cycle handling

Weak maps preserve cycles without retaining merged graphs after the operation.
The pair memo identifies a repeated target/source recursion. The clone memo
preserves repeated references when a source value is cloned into the result.

## Distribution

One source module produces:

- `dist/index.js`: ESM;
- `dist/index.cjs`: callable CommonJS;
- `dist/index.min.js`: browser global;
- resolver-specific `.d.ts`, `.d.cts`, and `.d.mts` declarations;
- source maps for each JavaScript build.

The CommonJS footer assigns the function itself to `module.exports`, preserving
legacy `require('deepmerge')({...})` usage.
