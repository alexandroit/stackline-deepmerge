# Changelog

All notable changes are documented here. This project follows Semantic
Versioning.

## [1.1.0] - 2026-10-13

This release makes the default behavior match `deepmerge@4.3.1` exactly for
every input that deepmerge 4 merges safely, and moves Stackline's hardening
into explicit options. Code that switches from `deepmerge` keeps its results.
See [COMPATIBILITY.md](docs/COMPATIBILITY.md) and
[UPSTREAM.md](docs/UPSTREAM.md).

### Fixed

- A repeated reference to an input object could receive the merged result of
  an earlier branch instead of its own copy. For example,
  `merge({ a: shared }, { a: { b: 1 }, c: shared }).c` contained `b`.
- Keys replaced by the source moved to the end of the result. Key order now
  matches deepmerge 4, so `JSON.stringify` output is identical.
- Repeated references that are not cycles were shared in the result, so
  mutating one copy changed another. They are now independent copies, as in
  deepmerge 4.
- React 19 elements (`react.transitional.element`) are atomic instead of having
  their props merged (deepmerge#265).
- `merge.all` and the other static helpers are typed on the ESM default export,
  so `import merge from 'deepmerge'; merge.all(...)` compiles under modern
  TypeScript resolution.

### Changed

- `null`, `false`, and other falsy options, and falsy `arrayMerge`,
  `isMergeableObject`, or `customMerge` hooks, fall back to the defaults like
  deepmerge 4 instead of throwing. A non-function hook fails only when it is
  called.
- `constructor` and `prototype` are handled like deepmerge 4 by default; only
  `__proto__` is always dropped. `unsafeKeys: 'strict'` keeps the 1.0 policy.
  Setting `onUnsafeKey` explicitly also selects the strict policy, so 1.0
  configurations that set it behave as before.
- `maxDepth` and `maxKeys` are unlimited by default, like deepmerge 4. Use
  `strict` or set them explicitly to keep the 1.0 limits.
- Options are read with their prototype chain and property descriptors, so
  inherited, non-enumerable, and accessor options work as in deepmerge 4.
- A target value that the source replaces is no longer cloned first, so
  callbacks may run fewer times than in deepmerge 4.
- About 2.3 times the 1.0.4 throughput on the included benchmark, and about
  30% faster than `deepmerge@4.3.1`.
- The browser bundle budget is 12 KB minified.
- Development only: `brace-expansion` updated to 5.0.12 for
  GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, and GHSA-6j4f-fj2g-mc7p. The
  published package still has no runtime dependencies.

### Added

- `strict` and `strictOptions`: a preset with the strict key policy,
  `onUnsafeKey: 'throw'`, `maxDepth: 1000`, and `maxKeys: 100000`.
- `createDeepmerge(defaults)`: reusable merge functions with preset options and
  a matching `all`.
- `unsafeKeys: 'compatible' | 'strict'` option.
- `skipUndefined` option (deepmerge#242).
- `mergeCollections` option to deep merge `Map` entries and union `Set` values
  (deepmerge#202, #204).
- `customMergeScope: 'all'` to consult `customMerge` for primitive values
  (deepmerge#216, #184).
- A third `customMerge` argument with the property path and both values
  (deepmerge#263, #197).
- `isPlainMergeableObject` predicate that keeps class instances and built-ins
  intact (deepmerge#152, #208, #256).
- Array strategies `overwriteArrays`, `mergeArraysByIndex`,
  `concatUniqueArrays`, and `mergeArraysByKey(selector)` (deepmerge#190). They
  also work as hooks for deepmerge 4.
- Regression tests for every published CVE-2026-93753 attack variant, run
  against both packages. No Stackline release is affected.
- An exact differential suite that compares complete output graphs with
  deepmerge 4.3.1 across a mixed-type corpus and ten option variants.
- Traceability of every upstream issue, pull request, branch, and fork in
  `docs/UPSTREAM.md`.

## [1.0.4] - 2026-09-28

- Validate documentation badges and synchronize the current version labels.

No runtime API or declaration behavior changed in this release.

## [1.0.3] - 2026-09-28

- Standardize the README, credits, and package discovery metadata.

No runtime API or declaration behavior changed in this release.

## [1.0.2] - 2026-09-28

- Organize package documentation, preserve API and migration examples, and add
  Stackline community links.
- Improve package discovery keywords with precise domain terms and `stackline`.
- Pin GitHub Actions release tooling and require an explicit missing-version
  response before publication.

## [1.0.1] - 2026-08-21

### Added

- Executable adoption examples for hostile configuration input, custom array
  strategies, cycles, and shared references.
- Direct-install and npm-alias migration guide.
- Reproducible benchmark methodology and public Stackline catalog link.
- First-party documentation analytics that never records playground input.
- Trusted-publishing workflow for provenance-enabled future releases.

### Changed

- Package tarballs now include the public guides and executable examples.
- CI resolves release tarballs dynamically instead of hardcoding a version.

No runtime API or declaration behavior changed in this release.

## [1.0.0] - 2026-08-16

### Added

- Immutable deep object and array merge with zero runtime dependencies.
- Default API compatibility with `deepmerge` v4, including `all`,
  `arrayMerge`, `customMerge`, `clone`, and `isMergeableObject`.
- Prototype-pollution protection for `__proto__`, `prototype`, and
  `constructor` in target and source objects at every depth.
- Optional strict unsafe-key rejection through `onUnsafeKey: 'throw'`.
- Circular and shared-reference preservation.
- Configurable `maxDepth` and `maxKeys` traversal limits.
- ESM, callable CommonJS, browser-global, and source-map distributions.
- TypeScript declarations tested from 3.9 through 7.0.
- Differential compatibility tests against `deepmerge@4.3.1`.
- Public documentation, security policy, CI matrix, and live playground.

[1.1.0]: https://github.com/alexandroit/stackline-deepmerge/compare/v1.0.1...v1.1.0
[1.0.4]: https://www.npmjs.com/package/@stackline/deepmerge/v/1.0.4
[1.0.3]: https://www.npmjs.com/package/@stackline/deepmerge/v/1.0.3
[1.0.2]: https://www.npmjs.com/package/@stackline/deepmerge/v/1.0.2
[1.0.1]: https://github.com/alexandroit/stackline-deepmerge/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/alexandroit/stackline-deepmerge/releases/tag/v1.0.0
