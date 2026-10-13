import assert from 'node:assert/strict';

import merge, { UnsafeKeyError, strict } from '@stackline/deepmerge';

const defaults = {
  cache: { enabled: true, ttl: 60 },
  server: { host: '127.0.0.1', port: 3000 }
};
const environment = JSON.parse(`{
  "server": { "port": 8080 },
  "__proto__": { "isAdmin": true },
  "constructor": { "prototype": { "isAdmin": true } }
}`);

// The default mode filters the payload without changing deepmerge 4 results.
const config = merge(defaults, environment);

assert.deepEqual(config, {
  cache: { enabled: true, ttl: 60 },
  server: { host: '127.0.0.1', port: 8080 }
});
assert.equal(config.isAdmin, undefined);
assert.equal(Object.prototype.isAdmin, undefined);

// The strict preset rejects the whole input and bounds depth and size.
assert.throws(() => strict(defaults, environment), UnsafeKeyError);

console.log(config);
