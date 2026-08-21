import assert from 'node:assert/strict';

import merge from '@stackline/deepmerge';

const overwriteArrays = (_target, source) => source;
const config = merge(
  { plugins: ['core'], server: { port: 3000 } },
  { plugins: ['metrics'], server: { secure: true } },
  { arrayMerge: overwriteArrays }
);

assert.deepEqual(config, {
  plugins: ['metrics'],
  server: { port: 3000, secure: true }
});

console.log(config);
