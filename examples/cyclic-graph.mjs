import assert from 'node:assert/strict';

import merge from '@stackline/deepmerge';

const shared = { enabled: true };
const source = { first: shared, second: shared };
source.self = source;

const result = merge({}, source);

assert.equal(result.first, result.second);
assert.equal(result.self, result);

console.log({ cyclePreserved: true, sharedReferencePreserved: true });
