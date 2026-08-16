import assert from 'node:assert/strict';
import test from 'node:test';

import merge, { UnsafeKeyError } from '../src/index.js';

const dangerousKeys = ['__proto__', 'prototype', 'constructor'];

test('drops dangerous keys from untrusted source objects at every depth', () => {
  delete Object.prototype.stacklinePolluted;
  const payload = JSON.parse(`{
    "safe": true,
    "nested": {
      "value": 42,
      "__proto__": {"stacklinePolluted": "proto"},
      "constructor": {"prototype": {"stacklinePolluted": "constructor"}},
      "prototype": {"stacklinePolluted": "prototype"}
    },
    "list": [{"__proto__": {"stacklinePolluted": "array"}, "ok": true}]
  }`);

  const result = merge({}, payload);

  assert.equal(Object.prototype.stacklinePolluted, undefined);
  assert.equal({}.stacklinePolluted, undefined);
  assert.deepEqual(result, {
    safe: true,
    nested: { value: 42 },
    list: [{ ok: true }]
  });
  assertNoDangerousOwnKeys(result);
});

test('drops dangerous keys from the target as well as the source', () => {
  const target = JSON.parse(
    '{"safeTarget":true,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
  );
  const source = JSON.parse(
    '{"safeSource":true,"prototype":{"polluted":true}}'
  );

  const result = merge(target, source);
  assert.deepEqual(result, { safeTarget: true, safeSource: true });
  assert.equal(Object.prototype.polluted, undefined);
  assertNoDangerousOwnKeys(result);
});

test('does not invoke getters hidden behind rejected unsafe keys', () => {
  let reads = 0;
  const source = {};
  for (const key of dangerousKeys) {
    Object.defineProperty(source, key, {
      enumerable: true,
      get() {
        reads += 1;
        return { polluted: true };
      }
    });
  }

  assert.deepEqual(merge({}, source), {});
  assert.equal(reads, 0);
});

test('throw mode reports the rejected path without partial pollution', () => {
  const source = {
    account: JSON.parse('{"profile":{"constructor":{"prototype":{"admin":true}}}}')
  };

  assert.throws(
    () => merge({}, source, { onUnsafeKey: 'throw' }),
    (error) => {
      assert.equal(error instanceof UnsafeKeyError, true);
      assert.equal(error.code, 'ERR_DEEPMERGE_UNSAFE_KEY');
      assert.equal(error.key, 'constructor');
      assert.equal(error.path, '<root>.account.profile.constructor');
      return true;
    }
  );
  assert.equal(Object.prototype.admin, undefined);
});

test('ignores inherited properties and polluted prototype gadgets', () => {
  Object.prototype.stacklineInherited = { shouldNotAppear: true };
  try {
    const source = { own: true, stacklineInherited: 'attacker override' };
    const result = merge({}, source);
    assert.deepEqual(Object.keys(result), ['own']);
    assert.equal(Object.hasOwn(result, 'stacklineInherited'), false);
  } finally {
    delete Object.prototype.stacklineInherited;
  }
});

test('uses data properties for accepted keys and never the __proto__ setter', () => {
  const source = Object.create(null);
  Object.defineProperty(source, '__proto__', {
    enumerable: true,
    value: { polluted: true }
  });
  source.safe = 'kept';

  const result = merge(Object.create(null), source);
  assert.equal(result.safe, 'kept');
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal({}.polluted, undefined);
});

test('keeps symbols whose descriptions resemble unsafe string keys', () => {
  const protoSymbol = Symbol('__proto__');
  const constructorSymbol = Symbol('constructor');
  const source = {
    [protoSymbol]: { safe: true },
    [constructorSymbol]: { safe: true }
  };

  const result = merge({}, source);
  assert.deepEqual(result[protoSymbol], { safe: true });
  assert.deepEqual(result[constructorSymbol], { safe: true });
  assert.equal(Object.prototype.polluted, undefined);
});

function assertNoDangerousOwnKeys(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const key of dangerousKeys) {
    assert.equal(Object.hasOwn(value, key), false, `unexpected own key ${key}`);
  }
  for (const nested of Object.values(value)) assertNoDangerousOwnKeys(nested, seen);
}
