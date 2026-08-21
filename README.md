# @stackline/deepmerge

> Secure, immutable, zero-dependency deep merge for modern JavaScript, with a
> `deepmerge`-compatible API.

[![npm version](https://img.shields.io/npm/v/@stackline/deepmerge.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/deepmerge)
[![npm downloads](https://img.shields.io/npm/dm/@stackline/deepmerge.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/deepmerge)
[![CI](https://img.shields.io/github/actions/workflow/status/alexandroit/stackline-deepmerge/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/alexandroit/stackline-deepmerge/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@stackline/deepmerge.svg?style=flat-square)](LICENSE)
[![zero dependencies](https://img.shields.io/badge/runtime%20dependencies-0-159957?style=flat-square)](package.json)

**[Docs and playground](https://alexandro.net/docs/vanilla/deepmerge/)** |
**[npm](https://www.npmjs.com/package/@stackline/deepmerge)** |
**[Security](SECURITY.md)** |
**[Changelog](CHANGELOG.md)** |
**[Issues](https://github.com/alexandroit/stackline-deepmerge/issues)**

## Why this package?

Deep merge sits on a trust boundary in configuration loaders, build tools,
servers, CLIs, and browser applications. A useful replacement must be safe for
untrusted object keys without forcing existing projects to rewrite every merge.

`@stackline/deepmerge` combines:

- rejection of `__proto__`, `prototype`, and `constructor` at every depth;
- immutable merges with cycle and shared-reference preservation;
- configurable depth and key limits for hostile or malformed inputs;
- the familiar `deepmerge` v4 default API and extension hooks;
- ESM, callable CommonJS, TypeScript, and browser builds;
- TypeScript compatibility tested from 3.9 through 7.0;
- zero runtime dependencies.

## Installation

Install under the package's public name:

```bash
npm install @stackline/deepmerge
```

Or replace `deepmerge` without changing application imports:

```bash
npm install deepmerge@npm:@stackline/deepmerge
```

Existing code can continue to use:

```js
import merge from 'deepmerge';

const config = merge(defaults, environment);
```

## Quick start

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

## Secure by default

Dangerous keys are skipped from both inputs before their values are read:

```js
import merge from '@stackline/deepmerge';

const payload = JSON.parse(`{
  "profile": {
    "name": "Ada",
    "constructor": {
      "prototype": { "isAdmin": true }
    }
  }
}`);

const result = merge({}, payload);

console.log(result);                    // { profile: { name: 'Ada' } }
console.log(Object.prototype.isAdmin); // undefined
```

Use strict rejection when silent filtering is not appropriate:

```js
merge({}, payload, { onUnsafeKey: 'throw' });
// UnsafeKeyError: Refusing to merge unsafe key constructor at
// <root>.profile.constructor
```

Security limits are enabled by default:

```js
merge(target, source, {
  maxDepth: 1000,
  maxKeys: 100000
});
```

Set a smaller limit at an exposed API boundary. `Infinity` is accepted when
the input is already trusted.

## API compatibility

### `merge(target, source, options?)`

Returns a new merged value. Objects merge recursively. Arrays concatenate by
default. When an array and object occupy the same position, the source wins.

### `merge.all(objects, options?)`

```js
const config = merge.all([
  { logging: { level: 'info' } },
  { logging: { format: 'json' } },
  { region: 'ca-central-1' }
]);
```

### Options

| Option | Default | Purpose |
| :--- | :--- | :--- |
| `arrayMerge` | concatenate | Replace or customize array behavior |
| `clone` | `true` | Set `false` to preserve nested input references |
| `customMerge` | none | Select a merge function for a property |
| `isMergeableObject` | built in | Decide which values can be traversed |
| `onUnsafeKey` | `"skip"` | Skip or throw on dangerous keys |
| `maxDepth` | `1000` | Bound recursive traversal |
| `maxKeys` | `100000` | Bound enumerable object keys per merge |

The callback options include `cloneUnlessOtherwiseSpecified`, matching the
extension-hook shape used by `deepmerge` v4.

### Named exports

```js
import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  all,
  deepmerge,
  isMergeableObject
} from '@stackline/deepmerge';
```

CommonJS remains callable:

```js
const merge = require('@stackline/deepmerge');

merge({ left: true }, { right: true });
merge.all([{ one: 1 }, { two: 2 }]);
```

## Array strategies

Overwrite arrays:

```js
const overwrite = (_target, source) => source;
const result = merge([1, 2], [3], { arrayMerge: overwrite });
// [3]
```

Merge arrays by index:

```js
const byIndex = (target, source, options) => {
  const output = target.slice();

  source.forEach((value, index) => {
    output[index] = index in output
      ? merge(output[index], value, options)
      : options.cloneUnlessOtherwiseSpecified(value, options);
  });

  return output;
};
```

## Cycles and shared references

Circular and repeated references are preserved instead of overflowing the
stack or being duplicated unexpectedly:

```js
const shared = { enabled: true };
const source = { first: shared, second: shared };
source.self = source;

const result = merge({}, source);

result.first === result.second; // true
result.self === result;         // true
```

## TypeScript

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

The release matrix tests TypeScript `3.9`, `4.7`, `4.9`, `5.9`, `6.0`, and
`7.0`. The JavaScript runtime supports Node.js `14.17` and newer.

## Browser

Use the ESM build with a bundler, or load the small browser global directly:

```html
<script src="https://unpkg.com/@stackline/deepmerge@1/dist/index.min.js"></script>
<script>
  const merged = StacklineDeepmerge(
    { theme: { contrast: 'normal' } },
    { theme: { motion: 'reduced' } }
  );
</script>
```

## Migration from `deepmerge`

The lowest-change migration uses an npm alias:

```bash
npm uninstall deepmerge
npm install deepmerge@npm:@stackline/deepmerge
```

The compatibility suite covers documented options and 5,000 deterministic,
JSON-compatible differential cases against `deepmerge@4.3.1`.

Intentional hardening differences:

- dangerous keys are always rejected or skipped;
- cycles are preserved;
- traversal limits are enabled by default;
- invalid option values fail early with a controlled error.

See [Compatibility](docs/COMPATIBILITY.md) for the full contract.

## Performance

Security checks, cycle tracking, and resource limits add measurable work. The
included benchmark compares this package with `deepmerge@4.3.1` on the same
process:

```bash
npm run benchmark
```

Use benchmark results as regression signals, not universal claims. Runtime,
CPU, input shape, and custom callbacks materially affect throughput.

## Adoption resources

- [Direct install and drop-in alias guide](docs/ADOPTION.md)
- [Reproducible benchmark methodology](docs/BENCHMARKS.md)
- [Executable examples](examples)
- [Stackline open-source catalog](https://alexandro.net/docs/open-source/)

The examples are included in the npm tarball and run against the package's
public exports. They cover hostile configuration input, custom array strategy,
cycles, and shared references.

## Trust and maintenance

- No runtime dependencies.
- Every release is built from the public repository.
- CI validates behavior, types, package exports, clean installs, and supported
  runtimes.
- Security reports have a dedicated private process in [SECURITY.md](SECURITY.md).
- Release history is recorded in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Changes
to compatibility or security behavior require focused regression tests.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

`@stackline/deepmerge` is an independent project and is not affiliated with or
endorsed by the maintainers of the `deepmerge` package.
