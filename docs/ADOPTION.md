# Adoption Guide

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
// or
const merge = require('deepmerge');
```

Commit the changed lockfile and run the application's complete test suite. The
alias changes package resolution, so source imports do not need to change.

## Choose the direct install when

- the application is new;
- imports can use the Stackline package name;
- the opt-in features or the `strict` preset will be used explicitly.

```bash
npm install @stackline/deepmerge
```

```js
import merge from '@stackline/deepmerge';
```

## What changes after the swap

Nothing, for inputs that `deepmerge@4.3.1` merges safely. The differences are
limited to inputs where deepmerge 4 crashes or returns an unsafe result:

- `__proto__` keys are dropped instead of replacing the result's prototype
  (CVE-2026-93753);
- circular references are reproduced instead of overflowing the stack;
- frozen options objects work instead of throwing;
- React 19 elements stay intact instead of having their props merged;
- the options object is never mutated.

Callbacks may run fewer times, because a target value that the source replaces
is not cloned first. See [COMPATIBILITY.md](COMPATIBILITY.md) for the full
contract.

## Security boundary

The default mode already removes the CVE-2026-93753 attack surface. At an
exposed boundary, such as a request body merged into defaults, add the strict
key policy and limits:

```js
import { strict } from '@stackline/deepmerge';

const config = strict(defaults, JSON.parse(body));
```

`strict` throws `UnsafeKeyError` for `__proto__`, `constructor`, or `prototype`
at any depth, and `DeepMergeLimitError` past 1,000 levels or 100,000 keys. Pass
`{ onUnsafeKey: 'skip' }` to filter instead of rejecting.

## Adopting the opt-in features

Opt-in features never change existing results until they are enabled. A common
path is one configured merge for the whole application:

```js
import { createDeepmerge, isPlainMergeableObject, mergeArraysByKey } from '@stackline/deepmerge';

export const mergeConfig = createDeepmerge({
  arrayMerge: mergeArraysByKey('name'),
  isMergeableObject: isPlainMergeableObject,
  skipUndefined: true
});
```

## Compatibility review

Before migration, review custom `arrayMerge`, `customMerge`, and
`isMergeableObject` callbacks. They receive the deepmerge 4 call shape, plus a
third `customMerge` argument with the path and both values. Code that reads the
options object after a merge and expects deepmerge 4 to have added
`arrayMerge`, `isMergeableObject`, or `cloneUnlessOtherwiseSpecified` to it must
read those values inside the callbacks instead.
