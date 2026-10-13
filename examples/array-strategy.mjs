import assert from 'node:assert/strict';

import merge, {
  concatUniqueArrays,
  mergeArraysByIndex,
  overwriteArrays
} from '@stackline/deepmerge';

const target = { plugins: ['core'], servers: [{ host: 'a', port: 80 }], server: { port: 3000 } };
const source = { plugins: ['metrics'], servers: [{ port: 8080 }], server: { secure: true } };

// Default: arrays concatenate, like deepmerge 4.
assert.deepEqual(merge(target, source).plugins, ['core', 'metrics']);

// The source array replaces the target array.
assert.deepEqual(merge(target, source, { arrayMerge: overwriteArrays }), {
  plugins: ['metrics'],
  servers: [{ port: 8080 }],
  server: { port: 3000, secure: true }
});

// Items at the same index are deep merged.
assert.deepEqual(merge(target, source, { arrayMerge: mergeArraysByIndex }).servers, [
  { host: 'a', port: 8080 }
]);

// Concatenation without repeated values.
assert.deepEqual(
  merge({ tags: ['a', 'b'] }, { tags: ['b', 'c'] }, { arrayMerge: concatUniqueArrays }),
  { tags: ['a', 'b', 'c'] }
);

console.log(merge(target, source, { arrayMerge: mergeArraysByIndex }));
