# Upstream issues and pull requests

This page maps every open issue and pull request in
[TehShrike/deepmerge](https://github.com/TehShrike/deepmerge), the security
advisory, the unreleased branches, and every fork that carries its own changes
to how `@stackline/deepmerge` handles them. It was last reviewed on 2026-10-13,
against 143 issues, 137 pull requests, and 227 forks.

The rule for every decision: **results for existing deepmerge 4 code never
change**. A request becomes a default only when deepmerge 4 crashes or returns
an unsafe result for that input. Everything else is opt-in or declined.

| Status | Meaning |
| :--- | :--- |
| Fixed | Works without configuration |
| Opt-in | Available through an option or export; the default is unchanged |
| Supported | Already worked in deepmerge 4.3.1 and still does |
| Declined | Would change deepmerge 4 results; the reason is given |

## Issues

| Issue | Request | Status | How |
| :--- | :--- | :--- | :--- |
| [#147](https://github.com/TehShrike/deepmerge/issues/147) | Useless `Partial` in the type definition | Fixed | The first overload is `deepmerge<T1, T2>(target: T1, source: T2)`; the `Partial<T>` overload stays for explicit generic calls |
| [#152](https://github.com/TehShrike/deepmerge/issues/152) | Merge only plain objects by default | Opt-in | `isMergeableObject: isPlainMergeableObject`; a new default would change results |
| [#161](https://github.com/TehShrike/deepmerge/issues/161) | Drop ES5 | Fixed | ES2018 build; Node.js 14.17+ |
| [#163](https://github.com/TehShrike/deepmerge/issues/163) | Keep the `clone` option | Supported | `clone` keeps its v4 meaning |
| [#169](https://github.com/TehShrike/deepmerge/issues/169) | Use the key order of the newest object | Declined | Key order is part of the v4 result; it changes `JSON.stringify` output |
| [#176](https://github.com/TehShrike/deepmerge/issues/176) | Call `customMerge` while cloning | Declined | Changes v4 results; `customMergeScope: 'all'` covers the underlying primitive-value use case |
| [#179](https://github.com/TehShrike/deepmerge/issues/179) | Type definition error | Fixed | Recursive `Merge<T1, T2>` return type |
| [#180](https://github.com/TehShrike/deepmerge/issues/180) | Test the type definitions | Fixed | CI compiles real consumer code with TypeScript 3.9, 4.7, 4.9, 5.9, 6.0, and 7.0 |
| [#183](https://github.com/TehShrike/deepmerge/issues/183) | Webpack cannot resolve `deepmerge` | Fixed | Conditional `exports` for ESM, CommonJS, browser, and types |
| [#184](https://github.com/TehShrike/deepmerge/issues/184) | Pass the key to `isMergeableObject` | Opt-in | `customMergeScope: 'all'` plus the `customMerge` context handles per-key primitive merges without changing the predicate signature |
| [#186](https://github.com/TehShrike/deepmerge/issues/186) | Merge into the target (`mergeWithTarget`) | Declined | Mutating inputs breaks the immutability contract |
| [#190](https://github.com/TehShrike/deepmerge/issues/190) | Merge a specific array item | Opt-in | `arrayMerge: mergeArraysByIndex` |
| [#194](https://github.com/TehShrike/deepmerge/issues/194) | Export ES modules | Fixed | Native ESM with default and named exports |
| [#197](https://github.com/TehShrike/deepmerge/issues/197) | Decide a custom merge from the key and both values | Opt-in | `customMerge(key, options, { path, target, source })` |
| [#199](https://github.com/TehShrike/deepmerge/issues/199) | `customMerge` never called | Opt-in | v4 calls it only for mergeable source values whose key exists in the target, which is documented; `customMergeScope: 'all'` also covers primitives |
| [#201](https://github.com/TehShrike/deepmerge/issues/201) | `merge` and `merge.all` differ with some options | Supported | `all` starts from `{}` exactly like v4; `createDeepmerge` shares one option set across both |
| [#202](https://github.com/TehShrike/deepmerge/issues/202) | `Set` values are lost | Opt-in | `mergeCollections: true`, or `isPlainMergeableObject` to keep sets by reference |
| [#204](https://github.com/TehShrike/deepmerge/issues/204) | Merge `Map` and `Set` | Opt-in | `mergeCollections: true` deep merges map entries and unions sets |
| [#207](https://github.com/TehShrike/deepmerge/issues/207) | Handle circular references | Fixed | Cycles are reproduced instead of overflowing the stack |
| [#208](https://github.com/TehShrike/deepmerge/issues/208) | Class information is discarded | Opt-in | `isPlainMergeableObject` keeps class instances intact |
| [#210](https://github.com/TehShrike/deepmerge/issues/210) | Throw when target and source types differ | Opt-in | Throw from `customMerge` after checking `context.target` and `context.source`; v4 returns the source |
| [#212](https://github.com/TehShrike/deepmerge/issues/212) | Stop cloning by default | Declined | Changes v4 results; `clone: false` remains available |
| [#216](https://github.com/TehShrike/deepmerge/issues/216) | `customMerge` at the lowest level | Opt-in | `customMergeScope: 'all'` |
| [#237](https://github.com/TehShrike/deepmerge/issues/237) | High CPU on large merges | Fixed | Faster than v4 on the included benchmark; `maxDepth` and `maxKeys` bound hostile input |
| [#241](https://github.com/TehShrike/deepmerge/issues/241) | Will v5 ship? | Opt-in | v5's useful ideas are available without its breaking defaults; see the branch table below |
| [#242](https://github.com/TehShrike/deepmerge/issues/242) | `undefined` overrides target values | Opt-in | `skipUndefined: true` |
| [#243](https://github.com/TehShrike/deepmerge/issues/243) | Delete an element from an array | Supported | Use an `arrayMerge` function; deletion semantics are application-specific |
| [#250](https://github.com/TehShrike/deepmerge/issues/250) | ESM, `module`, and `browser` fields | Fixed | All three are published |
| [#255](https://github.com/TehShrike/deepmerge/issues/255) | `deepmerge_1.default is not a function` | Fixed | The CommonJS export is callable and also exposes `.default` |
| [#256](https://github.com/TehShrike/deepmerge/issues/256) | Class instances in arrays become plain objects | Opt-in | `isPlainMergeableObject` |
| [#258](https://github.com/TehShrike/deepmerge/issues/258) | Filter values during the merge | Opt-in | `customMergeScope: 'all'` with a `customMerge` that inspects `context.source` |
| [#261](https://github.com/TehShrike/deepmerge/issues/261) | Merge into an existing object like `Object.assign` | Declined | Mutating inputs breaks the immutability contract |
| [#262](https://github.com/TehShrike/deepmerge/issues/262) | Callback for colliding properties | Opt-in | `customMergeScope: 'all'` calls `customMerge` for every key present in both inputs |
| [#263](https://github.com/TehShrike/deepmerge/issues/263) | Pass parent values to `customMerge` | Opt-in | Third argument `{ path, target, source }` |
| [#264](https://github.com/TehShrike/deepmerge/issues/264) | Array target defaults to an empty array | Declined | v4 clones a source-only array through `arrayMerge([], source)`; changing it changes hook results |
| [#265](https://github.com/TehShrike/deepmerge/issues/265) | React 19 elements are merged | Fixed | `react.transitional.element` values are atomic |
| [#266](https://github.com/TehShrike/deepmerge/issues/266) | `is-mergeable-object` is a dev dependency used at runtime | Fixed | Zero runtime dependencies |
| [#267](https://github.com/TehShrike/deepmerge/issues/267) | Symbol keys | Supported | Own enumerable symbol keys are copied and merged |
| [#271](https://github.com/TehShrike/deepmerge/issues/271) | Wrong return type for overlapping shapes | Fixed | The two-type overload is resolved first |
| [#272](https://github.com/TehShrike/deepmerge/issues/272) | Unnecessary files in the package | Fixed | An explicit `files` allowlist |
| [#273](https://github.com/TehShrike/deepmerge/issues/273) | Security advisory: prototype-poisoning guard bypass ([CVE-2026-93753](https://www.cve.org/CVERecord?id=CVE-2026-93753), CVSS 7.5) | Fixed | `__proto__` is dropped from targets and sources at every depth, including null-prototype targets, `null` or primitive placeholders, and own `__proto__` keys. `deepmerge@4.3.1`, the latest upstream release, is affected; the regression suite runs every published attack variant against both packages |
| [#279](https://github.com/TehShrike/deepmerge/issues/279) | Frozen options throw | Fixed | The options object is never mutated |

## Pull requests

| Pull request | Change | Status | How |
| :--- | :--- | :--- | :--- |
| [#282](https://github.com/TehShrike/deepmerge/pull/282) | Merge with frozen options | Fixed | Options are copied with their prototype and descriptors |
| [#278](https://github.com/TehShrike/deepmerge/pull/278) | React 19 elements are opaque | Fixed | Same marker check |
| [#277](https://github.com/TehShrike/deepmerge/pull/277) | Preserve own `__proto__` data properties | Declined | `__proto__` is dropped at every depth; preserving it would let the key reach later, less careful code |
| [#275](https://github.com/TehShrike/deepmerge/pull/275) | Document when `customMerge` is called | Fixed | Documented in the README |
| [#269](https://github.com/TehShrike/deepmerge/pull/269), [#268](https://github.com/TehShrike/deepmerge/pull/268) | Patch an upstream test dependency | Not applicable | Different toolchain |
| [#260](https://github.com/TehShrike/deepmerge/pull/260) | ESM support | Fixed | Native ESM |
| [#254](https://github.com/TehShrike/deepmerge/pull/254) | Dependency vulnerability fixes | Fixed | Zero runtime dependencies; development dependencies are audited in CI |
| [#248](https://github.com/TehShrike/deepmerge/pull/248) | Null-prototype results | Declined | Results keep `Object.prototype` like v4 |
| [#234](https://github.com/TehShrike/deepmerge/pull/234), [#223](https://github.com/TehShrike/deepmerge/pull/223) | Deep partial typing | Fixed | Recursive `Merge<T1, T2>` type |
| [#228](https://github.com/TehShrike/deepmerge/pull/228), [#185](https://github.com/TehShrike/deepmerge/pull/185) | Skip empty source values | Opt-in | `skipUndefined`, or `customMergeScope: 'all'` for other empty values |
| [#227](https://github.com/TehShrike/deepmerge/pull/227), [#226](https://github.com/TehShrike/deepmerge/pull/226), [#211](https://github.com/TehShrike/deepmerge/pull/211), [#198](https://github.com/TehShrike/deepmerge/pull/198) | Linting and TypeScript conversion | Fixed | Linted source with tested declaration files |
| [#217](https://github.com/TehShrike/deepmerge/pull/217) | New API with cloning off | Declined | Changes v4 results |
| [#200](https://github.com/TehShrike/deepmerge/pull/200) | Separate type for callback options | Fixed | `ArrayMergeOptions extends Options` |
| [#181](https://github.com/TehShrike/deepmerge/pull/181), [#148](https://github.com/TehShrike/deepmerge/pull/148) | Type definition fixes | Fixed | New declarations |
| [#177](https://github.com/TehShrike/deepmerge/pull/177) | Failing test for #176 | Declined | See #176 |

## Unreleased branches

| Branch | Change | Status |
| :--- | :--- | :--- |
| `prototype-polution-m342x` | Never copy `__proto__`, and check target keys too | Fixed: `__proto__` is dropped from targets and sources at every depth. `unsafeKeys: 'strict'` also drops `constructor` and `prototype` |
| `null-objects` | Null-prototype results | Declined, as #248 |
| `v5`: plain objects only | Breaking default | Opt-in through `isPlainMergeableObject` |
| `v5`: rename `isMergeableObject` to `isMergeable` | Breaking rename | Declined |
| `v5`: drop ES5 | Build target | Fixed |
| `v5`: avoid mutating options | Bug fix | Fixed |

## Forks

Each fork's default branch was compared with upstream `master`. Of the 227
forks, 179 carry no commits of their own, 7 could not be compared because the
branch or repository is gone, and 41 carry their own commits. Those changes
fall into these groups:

| Forks | Change | Status | How |
| :--- | :--- | :--- | :--- |
| `oss-cve-patches`, `PatrikHysky`, `ali-security` (two forks) | Patch CVE-2026-93753 by always dropping `__proto__` | Fixed | Same rule, also enforced for targets; `constructor` and `prototype` stay ordinary data, as in those patches |
| `Exifers/poly-merge` | Array strategies, including merge by identifier | Opt-in | `mergeArraysByKey(selector)`, `mergeArraysByIndex`, and the default concatenation |
| `hofnarwillie` | Named export for the README array strategies | Opt-in | `overwriteArrays`, `mergeArraysByIndex`, `concatUniqueArrays`, and `mergeArraysByKey` |
| `ricardocarrola`, `basicallydan` | Built-in index-based array merge | Opt-in | `mergeArraysByIndex` |
| `Logicalis`, `nileshchavan`, `faressoft`, `ngbp` | Replace arrays instead of concatenating | Opt-in | `overwriteArrays` |
| `kodergarten`, `TheHaff`, `johnlife` | Ignore empty source values (#185) | Opt-in | `skipUndefined`, or `customMergeScope: 'all'` for other empty values |
| `simondiep` | Sum numbers while merging | Opt-in | `customMergeScope: 'all'` with a `customMerge` that adds |
| `kodergarten` | v5 defaults: plain objects only, options not mutated | Opt-in / Fixed | `isPlainMergeableObject`; options are never mutated |
| `Spicy-Sparks` | Keep Immutable.js collections intact | Opt-in | `isPlainMergeableObject` treats them as atomic class instances |
| `bluelovers` | TypeScript rewrite with a composable predicate | Supported | Typed declarations; compose a predicate with the exported `isMergeableObject` |
| `asins`, `design-media-sf`, `sasaxing`, `PatrikHysky` | ESM build and runtime dependency fixes | Fixed | Native ESM and zero runtime dependencies |
| `chrislambe`, `eczn`, `EdwardDrapkin`, `marvinscharle`, `OliverRadini` | Type definition fixes | Fixed | New declarations, tested from TypeScript 3.9 to 7.0 |
| `seva-luchianov` | Failing test for #176 | Declined | See #176 |
| `denghongcai` | Merge in place | Declined | Mutating inputs breaks the immutability contract |
| `wnateg` | Copy only keys that already exist in the target | Declined | Changes v4 results; filter the source before merging |
| `eiriklv`, `Iragne`, `FreshXOpenSource`, `georapbox`, `cdambo`, `lukywong`, `gagan-bansal`, `fullstackers`, `firmfirm`, `midnightcodr`, `joaoafrmartins` | Patches to pre-4.0 code (null sources, `Date` values, `clone`, ES5 fallbacks), tests, and docs | Supported | Superseded by later upstream releases that this package matches |
| `fletchan` | CI experiments unrelated to merging | Not applicable | |
