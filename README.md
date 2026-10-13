# @stackline/deepmerge

> Drop-in replacement for `deepmerge` 4 that fixes CVE-2026-93753 and circular-reference crashes, with opt-in hardening and the most requested upstream features. Zero dependencies; ESM, CommonJS, TypeScript, and browsers.

[![npm version](https://img.shields.io/npm/v/@stackline/deepmerge.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/deepmerge)
[![license](https://img.shields.io/npm/l/@stackline/deepmerge.svg?style=flat-square)](https://github.com/alexandroit/stackline-deepmerge)
[![GitHub repository](https://img.shields.io/badge/GitHub-repository-181717?style=flat-square&logo=github)](https://github.com/alexandroit/stackline-deepmerge)
[![Docs](https://img.shields.io/badge/docs-alexandro.net-0f766e?style=flat-square)](https://alexandro.net/docs/vanilla/deepmerge/)
[![Reddit community](https://img.shields.io/badge/community-r%2FStackline-ff4500?style=flat-square&logo=reddit&logoColor=white)](https://www.reddit.com/r/Stackline/)

**[Documentation](https://alexandro.net/docs/vanilla/deepmerge/)** | **[npm](https://www.npmjs.com/package/@stackline/deepmerge)** | **[Issues](https://github.com/alexandroit/stackline-deepmerge/issues)** | **[Repository](https://github.com/alexandroit/stackline-deepmerge)**

**Current package version:** `1.1.0`

---

## Why this package?

> Change one line in `package.json`. Keep every result. Lose the
> vulnerability.

`deepmerge@4.3.1` is the latest upstream release. It was last published in
March 2023, it is affected by
[CVE-2026-93753](https://www.cve.org/CVERecord?id=CVE-2026-93753) (a `__proto__`
key can replace the prototype of the merged object), it overflows the stack on
circular references, and dozens of community requests remain open.

`@stackline/deepmerge` is built for the swap:

- **Same results.** Without options, every value, key order, prototype,
  property descriptor, and copy matches `deepmerge@4.3.1`. A differential suite
  compares complete output graphs on every test run, and deepmerge's own test
  suite passes against this package.
- **Fixed by default.** `__proto__` is dropped at every depth, cycles are
  reproduced instead of crashing, frozen options work, and React 19 elements
  stay intact.
- **Opt-in improvements.** A hardened `strict` preset, `Map` and `Set` merging,
  `skipUndefined`, array strategies (replace, by index, by key, unique),
  class-instance preservation, and richer `customMerge` hooks. See
  [how every upstream issue is handled](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/UPSTREAM.md).
- **Faster.** About 30% more operations per second than `deepmerge@4.3.1` on
  the included benchmark.
- **Modern packaging.** Native ESM, callable CommonJS, a browser global, and
  TypeScript declarations tested from 3.9 through 7.0. Zero runtime
  dependencies.

<a id="trust-and-maintenance"></a>

### Trust and maintenance

- No runtime dependencies.
- Every release is built from the public repository.
- CI validates behavior, types, package exports, clean installs, and supported
  runtimes.
- Security reports have a dedicated private process in [SECURITY.md](https://github.com/alexandroit/stackline-deepmerge/blob/main/SECURITY.md).
- Release history is recorded in [CHANGELOG.md](https://github.com/alexandroit/stackline-deepmerge/blob/main/CHANGELOG.md).

## Compatibility

| Item | Value |
| --- | --- |
| Package | `@stackline/deepmerge@1.1.0` |
| Replaces | `deepmerge@4.x` |
| Node.js runtime | `>=14.17.0` |
| CommonJS / primary entry | `./dist/index.cjs` |
| ES module entry | `./dist/index.js` |
| Type declarations | `./dist/index.d.ts` |

## Installation

Replace `deepmerge` without changing application imports:

```bash
npm install deepmerge@npm:@stackline/deepmerge
```

Or install under the package's public name:

```bash
npm install @stackline/deepmerge
```

## Usage

Existing code keeps working unchanged:

```js
import merge from 'deepmerge';

const config = merge(defaults, environment);
```

<a id="quick-start"></a>

### Quick start

```js
import merge from '@stackline/deepmerge';

const defaults = {
  server: { port: 3000, headers: { accept: 'application/json' } },
  plugins: ['core']
};

const production = {
  server: { port: 8080, headers: { authorization: 'Bearer token' } },
  plugins: ['metrics']
};

const config = merge(defaults, production);

// {
//   server: {
//     port: 8080,
//     headers: {
//       accept: 'application/json',
//       authorization: 'Bearer token'
//     }
//   },
//   plugins: ['core', 'metrics']
// }
```

Neither input is mutated.

## Features and Integrations

<a id="api-compatibility"></a>

### API compatibility

#### `merge(target, source, options?)`

Returns a new merged value. Objects merge recursively. Arrays concatenate by
default. When an array and an object occupy the same position, the source wins.
Keys keep the target order, and new source keys are appended.

#### `merge.all(objects, options?)`

```js
const config = merge.all([
  { logging: { level: 'info' } },
  { logging: { format: 'json' } },
  { region: 'ca-central-1' }
]);
```

#### deepmerge 4 options

| Option | Default | Purpose |
| :--- | :--- | :--- |
| `arrayMerge(target, source, options)` | concatenate | Replace or customize array behavior |
| `clone` | `true` | Set `false` to keep nested input references |
| `customMerge(key, options, context)` | none | Return a merge function for a property |
| `isMergeableObject(value)` | built in | Decide which values are traversed |

`customMerge` is consulted only when the key exists in the target and the
source value is mergeable, exactly like deepmerge 4. Return `undefined` to use
the default merge. The callback options include `cloneUnlessOtherwiseSpecified`,
matching the deepmerge 4 hook shape. Falsy options and hooks fall back to the
defaults, as in deepmerge 4.

#### Opt-in options

| Option | Default | Purpose |
| :--- | :--- | :--- |
| `unsafeKeys` | `'compatible'` | `'strict'` also drops `constructor` and `prototype` at every depth |
| `onUnsafeKey` | `'skip'` | `'throw'` rejects the whole merge; setting it selects the strict key policy |
| `maxDepth` | unlimited | Bound nesting depth |
| `maxKeys` | unlimited | Bound the keys read in one merge |
| `skipUndefined` | `false` | `undefined` source values do not replace existing target values |
| `mergeCollections` | `false` | Deep merge `Map` entries and union `Set` values |
| `customMergeScope` | `'objects'` | `'all'` also consults `customMerge` for primitive values |

#### Exports

```js
import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  all,
  concatUniqueArrays,
  createDeepmerge,
  deepmerge,
  isMergeableObject,
  isPlainMergeableObject,
  mergeArraysByIndex,
  mergeArraysByKey,
  overwriteArrays,
  strict,
  strictOptions
} from '@stackline/deepmerge';
```

Every export is also a static property of the default export, so
`merge.all(...)` and `merge.strict(...)` work in ESM, CommonJS, and the browser.
CommonJS remains callable:

```js
const merge = require('@stackline/deepmerge');

merge({ left: true }, { right: true });
merge.all([{ one: 1 }, { two: 2 }]);
```

<a id="hardened-mode"></a>

### Hardened mode

`strict` applies `unsafeKeys: 'strict'`, `onUnsafeKey: 'throw'`,
`maxDepth: 1000`, and `maxKeys: 100000`. Per-call options override the preset:

```js
import { strict } from '@stackline/deepmerge';

const config = strict(defaults, JSON.parse(requestBody));
const lenient = strict(defaults, input, { onUnsafeKey: 'skip' });
```

`createDeepmerge(defaults)` builds the same kind of function from your own
defaults, for one consistent merge across an application:

```js
import { createDeepmerge, overwriteArrays } from '@stackline/deepmerge';

const mergeConfig = createDeepmerge({ arrayMerge: overwriteArrays, skipUndefined: true });

mergeConfig(base, override);
mergeConfig.all([base, environment, cli]);
```

<a id="array-strategies"></a>

### Array strategies

```js
import merge, {
  concatUniqueArrays,
  mergeArraysByIndex,
  mergeArraysByKey,
  overwriteArrays
} from '@stackline/deepmerge';

merge({ list: [1, 2] }, { list: [3] }, { arrayMerge: overwriteArrays });
// { list: [3] }

merge({ list: [{ a: 1 }, 'x'] }, { list: [{ b: 2 }] }, { arrayMerge: mergeArraysByIndex });
// { list: [{ a: 1, b: 2 }, 'x'] }

merge(
  { plugins: [{ name: 'core', retries: 1 }] },
  { plugins: [{ name: 'metrics' }, { name: 'core', timeout: 5 }] },
  { arrayMerge: mergeArraysByKey('name') }
);
// { plugins: [{ name: 'core', retries: 1, timeout: 5 }, { name: 'metrics' }] }

merge({ tags: ['a', 'b'] }, { tags: ['b', 'c'] }, { arrayMerge: concatUniqueArrays });
// { tags: ['a', 'b', 'c'] }
```

`mergeArraysByKey` also accepts a function, such as
`mergeArraysByKey((item) => item.id.toLowerCase())`. Items without an
identifier are appended. All strategies also work as `arrayMerge` hooks for
deepmerge 4 itself.

<a id="class-instances-and-collections"></a>

### Class instances, `Map`, and `Set`

deepmerge 4 traverses every non-null object, so class instances become plain
objects and `Map` or `Set` values become `{}`. That remains the default. Opt in
to keep them:

```js
import merge, { isPlainMergeableObject } from '@stackline/deepmerge';

// Class instances, Map, Set, and other built-ins are copied by reference.
merge(target, source, { isMergeableObject: isPlainMergeableObject });

// Map entries are deep merged and Set values are unioned into new collections.
merge(
  { limits: new Map([['api', { rps: 10 }]]), tags: new Set(['a']) },
  { limits: new Map([['api', { burst: 20 }]]), tags: new Set(['b']) },
  { mergeCollections: true }
);
// { limits: Map { 'api' => { rps: 10, burst: 20 } }, tags: Set { 'a', 'b' } }
```

<a id="custom-merge"></a>

### Custom merge context

`customMerge` receives a third argument with the property path and both
values:

```js
merge(target, source, {
  customMerge(key, options, { path, target, source }) {
    if (Array.isArray(target) !== Array.isArray(source)) {
      throw new TypeError(`Type mismatch at ${path.join('.')}`);
    }
    return undefined;
  }
});
```

With `customMergeScope: 'all'`, `customMerge` also handles primitive values,
for example to add counters:

```js
merge({ stats: { visits: 3 } }, { stats: { visits: 2 } }, {
  customMergeScope: 'all',
  customMerge: (key) => (key === 'visits' ? (left, right) => left + right : undefined)
});
// { stats: { visits: 5 } }
```

<a id="cycles-and-shared-references"></a>

### Cycles and shared references

deepmerge 4 overflows the stack on circular input. This package reproduces the
cycle in the result instead:

```js
const source = { name: 'root' };
source.self = source;

const result = merge({}, source);
result.self === result; // true
```

Repeated references that are not cycles become independent copies, exactly
as in deepmerge 4:

```js
const shared = { enabled: true };
const result = merge({}, { first: shared, second: shared });

result.first === result.second; // false
```

<a id="typescript"></a>

### TypeScript

The package ships declaration files for modern ESM, CommonJS, and older
TypeScript resolvers. Return types recursively combine the target and source.

```ts
import merge from '@stackline/deepmerge';

const result = merge(
  { service: { port: 3000 } },
  { service: { secure: true } }
);

result.service.port;   // number
result.service.secure; // boolean
```

Code typed against the upstream `deepmerge` declarations, such as
`deepmerge.Options` or `deepmerge.all<T>()`, compiles unchanged. The release
matrix tests TypeScript `3.9`, `4.7`, `4.9`, `5.9`, `6.0`, and `7.0`. The
JavaScript runtime supports Node.js `14.17` and newer.

<a id="browser"></a>

### Browser

Use the ESM build with a bundler, or load the browser global directly
(about 10 KB minified, 4 KB gzipped):

```html
<script src="https://unpkg.com/@stackline/deepmerge@1/dist/index.min.js"></script>
<script>
  const merged = StacklineDeepmerge(
    { theme: { contrast: 'normal' } },
    { theme: { motion: 'reduced' } }
  );
</script>
```

<a id="migration-from-deepmerge"></a>

### Migration from `deepmerge`

The lowest-change migration uses an npm alias:

```bash
npm uninstall deepmerge
npm install deepmerge@npm:@stackline/deepmerge
```

Results differ from `deepmerge@4.3.1` only where deepmerge 4 crashes or
returns an unsafe result:

- `__proto__` keys are dropped instead of replacing the result's prototype
  (CVE-2026-93753);
- circular references are reproduced instead of overflowing the stack;
- frozen options objects work instead of throwing;
- React 19 elements are kept intact instead of having their props merged;
- the options object you pass is never mutated.

See [Compatibility](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/COMPATIBILITY.md)
for the full contract and how it is verified, and
[Upstream issues](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/UPSTREAM.md)
for every upstream issue, pull request, and fork.

<a id="performance"></a>

### Performance

The included benchmark merges the same nested configuration with both
packages in one process:

```bash
npm run benchmark
```

On Node.js 24.20, this release measured about 200,000 operations per second,
against about 150,000 for `deepmerge@4.3.1`. Use benchmark results as
regression signals, not universal claims. Runtime, CPU, input shape, and
custom callbacks materially affect throughput.

<a id="adoption-resources"></a>

### Adoption resources

- [Direct install and drop-in alias guide](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/ADOPTION.md)
- [Compatibility contract](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/COMPATIBILITY.md)
- [Upstream issues, pull requests, and forks](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/UPSTREAM.md)
- [Reproducible benchmark methodology](https://github.com/alexandroit/stackline-deepmerge/blob/main/docs/BENCHMARKS.md)
- [Executable examples](https://github.com/alexandroit/stackline-deepmerge/blob/main/examples)
- [Stackline open-source catalog](https://alexandro.net/docs/open-source/)

The examples are included in the npm tarball and run against the package's
public exports. They cover hostile configuration input, array strategies,
cycles, and a configured merge with collections and class instances.

## Security

<a id="secure-by-default"></a>

### Secure by default

`__proto__` is dropped from both inputs at every depth, before its value is
read, so the merged object can never inherit attacker-controlled properties:

```js
import merge from '@stackline/deepmerge';

const payload = JSON.parse('{ "session": { "__proto__": { "isAdmin": true } } }');

const result = merge({ session: null }, payload);

result.session.isAdmin;      // undefined (true with deepmerge 4.3.1)
Object.prototype.isAdmin;    // undefined
```

`constructor` and `prototype` are handled exactly like deepmerge 4: a source
key that only exists on the target's prototype chain is skipped, so the classic
`{ "constructor": { "prototype": ... } }` payload never reaches the result when
merged into a plain object. Accepted keys are always written as own data
properties, never through setters.

### Strict input handling

Use the strict key policy and limits at untrusted boundaries:

```js
import { strict } from '@stackline/deepmerge';

strict({}, JSON.parse('{ "profile": { "constructor": {} } }'));
// UnsafeKeyError: Refusing to merge unsafe key constructor at
// <root>.profile.constructor
```

Or pick the pieces you need:

```js
merge(target, source, {
  unsafeKeys: 'strict',
  onUnsafeKey: 'skip',
  maxDepth: 64,
  maxKeys: 10000
});
```

## Local Development

```sh
git clone https://github.com/alexandroit/stackline-deepmerge.git
cd stackline-deepmerge
npm ci
npm run test
```

Release tooling uses Node.js 24.20.0 and npm 11.19.0. The consumer runtime contract remains the one documented above.

<a id="contributing"></a>

### Contributing

Read [CONTRIBUTING.md](https://github.com/alexandroit/stackline-deepmerge/blob/main/CONTRIBUTING.md) before opening a pull request. Changes
to compatibility or security behavior require focused regression tests.

## Consumer Smoke Test

Run the repository's existing consumer/package check after installing development dependencies:

```sh
npm run test:install
```

## Release Checklist

Run `npm run test` and inspect the package contents before release. Publish a new version through the [GitHub Actions publishing workflow](https://github.com/alexandroit/stackline-deepmerge/actions/workflows/publish.yml), using the SHA-512 digest of the reviewed tarball. Verify the exact published version, tarball integrity, and npm provenance after the run.

## License

MIT. See [LICENSE](https://github.com/alexandroit/stackline-deepmerge/blob/main/LICENSE) and [NOTICE](https://github.com/alexandroit/stackline-deepmerge/blob/main/NOTICE).

`@stackline/deepmerge` is an independent project and is not affiliated with or
endorsed by the maintainers of the `deepmerge` package.

## Credits and original authors

- Alexandro Paixao Marques.
- Copyright (c) 2026 Alexandro Paixao Marques and contributors.
- Stackline maintenance: [Alexandro Paixao Marques](https://www.linkedin.com/in/aleinfo/) and [Stackline contributors](https://github.com/alexandroit).

Original copyright, license notices and contributor acknowledgements remain part of this distribution. Stackline maintenance does not replace authorship of the original work.

## Community and Links

- [Stackline website](https://alexandro.net/)
- [GitHub projects](https://github.com/alexandroit)
- [npm packages](https://www.npmjs.com/~alex360qc)
- [Reddit community — r/Stackline](https://www.reddit.com/r/Stackline/)
- [Maintainer LinkedIn](https://www.linkedin.com/in/aleinfo/)

Use this repository's issue tracker for reproducible bugs and feature requests. Join r/Stackline for examples, usage questions and release discussions.
