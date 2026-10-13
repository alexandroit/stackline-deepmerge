# Compatibility

`@stackline/deepmerge` is a drop-in replacement for `deepmerge@4.3.1`. Code
that works with deepmerge 4 returns the same result after the swap: the same
values, own-key order, prototypes, property descriptors, and independent copies
of repeated references. Every Stackline addition is opt-in.

## Behavioral target

The default contract follows `deepmerge@4.3.1`:

- inputs are not mutated;
- plain and custom mergeable objects recurse; other values are copied by
  reference;
- arrays concatenate and their items are cloned;
- the source wins when array and object shapes differ;
- keys keep the target order, and new source keys are appended;
- a source key that exists only on the target's prototype chain, or as a
  non-enumerable target property, is skipped;
- repeated references to the same input object become independent copies;
- `clone: false` preserves nested references;
- `arrayMerge`, `customMerge`, `isMergeableObject`, and the callback helper
  `cloneUnlessOtherwiseSpecified` keep the v4 call shape;
- falsy options and falsy hooks fall back to the defaults; a non-function hook
  fails only when it is called;
- `Date`, `RegExp`, and React elements are atomic;
- own enumerable symbols are copied;
- `all` merges an array of values from left to right, starting from `{}`;
- there is no depth or key limit.

## How compatibility is verified

`test/compatibility.test.mjs` runs both packages side by side and compares the
complete output graph, not just JSON equality:

- values with `Object.is`, so `-0` and `NaN` are distinguished;
- own-key order, including symbols;
- property descriptors and prototypes;
- aliasing inside the result, so shared or independent copies must match;
- identity of references to caller-owned input objects;
- the error type when deepmerge 4 throws;
- that no input is mutated.

The generated corpus mixes plain objects, null-prototype objects, sparse
arrays, `Date`, `RegExp`, React elements, class instances, `Map`, `Set`,
symbols, `BigInt`, non-enumerable properties, repeated references, and keys
such as `toString`, `constructor`, and `prototype`. Each case runs with ten
option variants (none, `null`, `clone: false`, custom array hooks, falsy
hooks, inherited options, a plain-object predicate, and key-specific
`customMerge`), through both `merge` and `merge.all`. The test also checks that
`customMerge` is called for the same keys in the same order.

The default run compares 1,500 cases (30,000 comparisons). Larger runs are
available for releases:

```bash
DEEPMERGE_DIFF_CASES=15000 DEEPMERGE_DIFF_SEED=1 node --test test/compatibility.test.mjs
```

The 1.1.0 release passed 45,000 cases across three seeds (900,000 comparisons)
with no difference.

`npm run test:upstream` also runs deepmerge's own 4.3.1 test suite (115
assertions) and the executable examples in its README against this package's
CommonJS build. CI runs it on every push.

## Intentional differences

These differences only change inputs that deepmerge 4 crashes on, or inputs
whose deepmerge 4 result is unsafe:

| Input | `deepmerge@4.3.1` | `@stackline/deepmerge` |
| :--- | :--- | :--- |
| `__proto__` in the target, or in a source merged into a null-prototype object or a `null` or primitive placeholder ([CVE-2026-93753](https://www.cve.org/CVERecord?id=CVE-2026-93753)) | Replaces the result's prototype with attacker data | The key is dropped at every depth |
| Circular references | `RangeError: Maximum call stack size exceeded` | Cycles are reproduced in the result |
| Frozen options object | `TypeError` | Merges normally |
| React 19 elements (`react.transitional.element`) | Props of two elements are merged together | Atomic, like earlier React elements |
| Options object after the call | Gains `arrayMerge`, `isMergeableObject`, and `cloneUnlessOtherwiseSpecified` | Never mutated |
| Very deep input (Node.js 24, default stack) | Stack overflow at about 1,450 nested objects or 1,350 nested arrays | Stack overflow at about 1,520 nested objects or 1,850 nested arrays, or a `DeepMergeLimitError` when `maxDepth` is set |

Two observable details also differ, without changing results:

- callbacks may run fewer times, because a target value that the source
  replaces is not cloned first;
- a target value that the source replaces is neither cloned nor read first.

## Cycle semantics

The result reuses a node only when the exact same merge or clone repeats along
the current path, which is precisely where deepmerge 4 would recurse forever.
Merging into an empty plain object or array counts as cloning the source, so
`merge({}, cyclic)` returns a result whose cycle points back to itself. For
every input that deepmerge 4 can merge, the output is identical.

## Opt-in additions

| Option or export | Default | Purpose |
| :--- | :--- | :--- |
| `unsafeKeys` | `'compatible'` | `'strict'` also drops `constructor` and `prototype` at every depth |
| `onUnsafeKey` | `'skip'` | `'throw'` rejects the operation; setting it selects the strict key policy |
| `maxDepth` | unlimited | Bounds nesting depth |
| `maxKeys` | unlimited | Bounds keys read in one merge |
| `skipUndefined` | `false` | `undefined` source values do not replace existing target values |
| `mergeCollections` | `false` | Deep merges `Map` entries and unions `Set` values |
| `customMergeScope` | `'objects'` | `'all'` also consults `customMerge` for primitive values |
| `customMerge` third argument | always passed | `{ path, target, source }` for the property being merged |
| `strict` | export | Preset with strict keys, `throw`, `maxDepth: 1000`, and `maxKeys: 100000` |
| `createDeepmerge(defaults)` | export | Reusable merge function with preset options |
| `isPlainMergeableObject` | export | Predicate that keeps class instances and built-ins intact |
| `overwriteArrays`, `mergeArraysByIndex`, `concatUniqueArrays`, `mergeArraysByKey(selector)` | exports | Ready-made `arrayMerge` strategies |

`unsafeKeys`, `onUnsafeKey`, `maxDepth`, `maxKeys`, and `customMergeScope` are
validated and throw a `TypeError` for unknown values. The array strategies also
work as hooks for deepmerge 4 itself.

## Module systems

| Consumer | Supported form |
| :--- | :--- |
| ESM | Default export with static helpers, and named exports |
| CommonJS | Callable `module.exports` plus static helpers |
| Bundlers | ESM `module` field and `browser` export condition |
| Browser script | `globalThis.StacklineDeepmerge` |
| npm alias | `deepmerge@npm:@stackline/deepmerge` |

## TypeScript

The release test matrix covers:

- 3.9.10;
- 4.7.4;
- 4.9.5;
- 5.9.3;
- 6.0.3;
- 7.0.2.

Older resolvers use `dist/index.d.ts`. Modern ESM and CommonJS resolvers use
`dist/index.d.mts` and `dist/index.d.cts` respectively. Code typed against the
upstream `deepmerge` declarations, including `deepmerge.Options`,
`deepmerge.ArrayMergeOptions`, `customMerge(key: string)`, and
`deepmerge.all<T>()`, compiles unchanged. `merge.all` and the other static
helpers are typed on the ESM default export too.

## Runtime

The published JavaScript targets ES2018 and declares Node.js 14.17 or newer.
The development toolchain requires a newer Node.js release; that does not alter
the package's runtime floor.

## Migration test

Test the alias in the consuming project without source changes:

```bash
npm install deepmerge@npm:@stackline/deepmerge
npm test
```

See [UPSTREAM.md](UPSTREAM.md) for how each upstream deepmerge issue and pull
request is addressed.
