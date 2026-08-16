# Compatibility

## Behavioral target

The default contract follows documented `deepmerge@4.3.1` behavior:

- inputs are not mutated;
- plain and custom mergeable objects recurse;
- arrays concatenate and clone by default;
- source wins when array/object shapes differ;
- `clone: false` preserves nested references;
- custom array and property merge hooks receive compatible options;
- Date, RegExp, and React element values are atomic by default;
- own enumerable symbols are copied;
- `all` merges an array of objects.

The test suite includes documented scenarios and a deterministic corpus of
5,000 JSON-compatible input pairs compared against `deepmerge@4.3.1`.

## Intentional differences

| Area | `@stackline/deepmerge` behavior |
| :--- | :--- |
| Dangerous keys | Always skipped or rejected at every depth |
| Cycles | Preserved through weak-reference memoization |
| Resource limits | Depth and key limits enabled by default |
| Invalid options | Rejected early with controlled errors |
| Package format | Native ESM, callable CJS, browser build, conditional types |
| Runtime dependencies | None |

## Module systems

| Consumer | Supported form |
| :--- | :--- |
| ESM | Default and named exports |
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
`dist/index.d.mts` and `dist/index.d.cts` respectively.

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

If a project relies on undocumented prototype keys, accessor descriptors, or a
specific cycle failure, treat migration as a behavior change and report the use
case before production rollout.
