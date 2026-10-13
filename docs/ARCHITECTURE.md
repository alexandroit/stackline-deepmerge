# Architecture

## Scope

The runtime has one responsibility: merge two JavaScript values without
mutating either input, with the exact results of `deepmerge@4.3.1` for every
input that deepmerge 4 merges safely.

## Options

Each top-level call copies the caller's options object, keeping its prototype
and own property descriptors, so inherited, non-enumerable, accessor, and
frozen options all work and the caller's object is never written. Defaults are
then resolved on the copy: falsy `arrayMerge` and `isMergeableObject` fall back
to the built-ins, and `cloneUnlessOtherwiseSpecified` is bound to the merge
state. The same copy is passed to every callback.

## Merge state

Each top-level merge creates isolated state containing:

- the resolved options and the Stackline option flags;
- the current depth and property path, used for limits and error messages;
- the cumulative key count when `maxKeys` is set;
- the operations currently in progress, used to detect cycles.

No state is shared between calls. A nested `deepmerge` call made from a
callback starts its own state, as in deepmerge 4.

## Traversal

`mergeInternal` dispatches by shape:

- with `mergeCollections`, a `Map` or `Set` source merges into a collection of
  the same kind or is cloned;
- array plus array uses the configured array strategy;
- mismatched array and object shapes clone the source;
- object plus object merges keys.

Objects are merged in two passes. The first pass walks target keys in order.
A key that the source will replace gets a placeholder so it keeps its target
position; other keys are cloned. The second pass walks source keys, skips keys
that exist on the target only through its prototype chain or as non-enumerable
properties, and writes the merged or cloned value. The result has the same key
order as deepmerge 4 without cloning values that are about to be replaced.

Accepted keys are written as own data properties. Keys that also exist on
`Object.prototype` are written with `Object.defineProperty`, so no inherited
setter runs and frozen intrinsics do not break assignment.

## Security invariants

Before reading an enumerable property value, traversal checks that:

1. the key is not `__proto__` (always) and, with `unsafeKeys: 'strict'`, not
   `constructor` or `prototype`;
2. the target does not expose the key only through an inherited or
   non-enumerable slot;
3. configured depth and key budgets have not been exceeded.

Rule 1 applies to both target and source keys, at every depth, which closes
CVE-2026-93753. Getters behind rejected keys are never invoked.

## Cycle handling

deepmerge 4 recurses forever when the same merge or clone repeats along the
current path. The state records each operation in progress: a merge by its
target and source pair, a clone by its source value. When an identical
operation is reached again, its in-progress result is returned, which closes the
cycle in the output. Merging into an empty plain object or array is recorded as
a clone of the source, because the two operations produce identical results.

Because only exact repeats along the current path are short-circuited, every
input that deepmerge 4 can merge follows exactly the same recursion and returns
the same result. Repeated references that are not cycles are copied
independently, as in deepmerge 4.

## Distribution

One source module produces:

- `dist/index.js`: ESM;
- `dist/index.cjs`: callable CommonJS;
- `dist/index.min.js`: browser global;
- resolver-specific `.d.ts`, `.d.cts`, and `.d.mts` declarations;
- source maps for each JavaScript build.

The CommonJS footer assigns the function itself to `module.exports`, preserving
legacy `require('deepmerge')({...})` usage. Every named export is also a static
property of the default export, and the ESM declarations type those statics.
