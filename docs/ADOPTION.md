# Adoption Guide

## Choose the direct install when

- the application is new;
- imports can use the Stackline package name;
- explicit ownership of the hardened behavior is desirable.

```bash
npm install @stackline/deepmerge
```

```js
import merge from '@stackline/deepmerge';
```

## Choose the npm alias when

- an application already imports `deepmerge`;
- a framework or internal package expects the existing package name;
- the migration should avoid source changes.

```bash
npm uninstall deepmerge
npm install deepmerge@npm:@stackline/deepmerge
```

Existing imports remain unchanged:

```js
import merge from 'deepmerge';
```

Commit the changed lockfile and run the application's complete test suite. The
alias changes package resolution, so source imports do not need to change.

## Security boundary

Use `onUnsafeKey: 'throw'` when an unsafe key should reject an entire request.
The default `skip` mode ignores `__proto__`, `prototype`, and `constructor` at
every traversed level. Depth and key budgets remain enabled in both modes.

## Compatibility review

Before migration, review custom `arrayMerge`, `customMerge`, and
`isMergeableObject` callbacks. The package preserves the documented v4 call
shape, while cycles, unsafe keys, invalid options, and traversal limits are
intentionally hardened.
