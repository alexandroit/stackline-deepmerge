import assert from 'node:assert/strict';

import { createDeepmerge, isPlainMergeableObject } from '@stackline/deepmerge';

class Connection {
  constructor(url) {
    this.url = url;
  }
}

// One configured merge function for the whole application.
const mergeConfig = createDeepmerge({
  isMergeableObject: isPlainMergeableObject,
  mergeCollections: true,
  skipUndefined: true
});

const connection = new Connection('postgres://db');
const config = mergeConfig(
  { db: { pool: 5 }, features: new Set(['audit']), limits: new Map([['api', { rps: 10 }]]) },
  {
    db: { pool: undefined, connection },
    features: new Set(['tracing']),
    limits: new Map([['api', { burst: 20 }]])
  }
);

// undefined does not erase the configured pool size.
assert.equal(config.db.pool, 5);
// Class instances are kept as-is instead of being flattened into plain objects.
assert.equal(config.db.connection, connection);
// Sets are unioned and Map entries are deep merged.
assert.deepEqual([...config.features], ['audit', 'tracing']);
assert.deepEqual(config.limits.get('api'), { rps: 10, burst: 20 });

console.log(config);
