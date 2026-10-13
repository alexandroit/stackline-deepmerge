import assert from 'node:assert/strict';

import merge from '@stackline/deepmerge';

const shared = { enabled: true };
const source = { first: shared, second: shared };
source.self = source;

// deepmerge 4.3.1 overflows the stack on this input.
const result = merge({}, source);

// Cycles stay cycles in the output.
assert.equal(result.self, result);

// Repeated references become independent copies, exactly like deepmerge 4.
assert.deepEqual(result.first, result.second);
assert.notEqual(result.first, result.second);
result.first.enabled = false;
assert.equal(result.second.enabled, true);

console.log({ cyclePreserved: true, repeatedReferencesCopiedIndependently: true });
