import assert from 'node:assert/strict';

import merge from '@stackline/deepmerge';

const defaults = {
  cache: { enabled: true, ttl: 60 },
  server: { host: '127.0.0.1', port: 3000 }
};
const environment = JSON.parse(`{
  "server": { "port": 8080 },
  "constructor": { "prototype": { "isAdmin": true } }
}`);

const config = merge(defaults, environment);

assert.deepEqual(config, {
  cache: { enabled: true, ttl: 60 },
  server: { host: '127.0.0.1', port: 8080 }
});
assert.equal(Object.prototype.isAdmin, undefined);

console.log(config);
