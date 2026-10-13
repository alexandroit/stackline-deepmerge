import assert from 'node:assert/strict';
import test from 'node:test';

import legacyMerge from 'deepmerge';
import merge, { UnsafeKeyError, strict } from '../src/index.js';

const dangerousKeys = ['__proto__', 'prototype', 'constructor'];

function cleanPrototype() {
  for (const key of ['stacklinePolluted', 'polluted', 'admin', 'isAdmin']) {
    delete Object.prototype[key];
  }
}

test('never pollutes Object.prototype or the result prototype in the default mode', () => {
  cleanPrototype();
  const payload = JSON.parse(`{
    "safe": true,
    "nested": {
      "value": 42,
      "__proto__": {"stacklinePolluted": "proto"},
      "constructor": {"prototype": {"stacklinePolluted": "constructor"}}
    },
    "list": [{"__proto__": {"stacklinePolluted": "array"}, "ok": true}]
  }`);

  const result = merge({ nested: { value: 1 } }, payload);

  assert.equal(Object.prototype.stacklinePolluted, undefined);
  assert.equal({}.stacklinePolluted, undefined);
  assert.equal(result.nested.stacklinePolluted, undefined);
  assert.equal(result.list[0].stacklinePolluted, undefined);
  assert.deepEqual(result, {
    safe: true,
    nested: { value: 42 },
    list: [{ ok: true }]
  });
  assertNoOwnKeys(result, ['__proto__']);
  assertPlainPrototypes(result);
});

test('drops __proto__ from targets where deepmerge 4.3.1 would replace the prototype', () => {
  cleanPrototype();
  const target = JSON.parse('{"safeTarget":true,"__proto__":{"admin":true}}');
  const legacy = legacyMerge(target, {});
  assert.equal(legacy.admin, true, 'deepmerge 4.3.1 copies the payload into the prototype');

  const result = merge(target, { safeSource: true });
  assert.deepEqual(result, { safeTarget: true, safeSource: true });
  assert.equal(result.admin, undefined);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.prototype.admin, undefined);
});

test('drops __proto__ merged into null-prototype targets', () => {
  const target = Object.create(null);
  const source = JSON.parse('{"__proto__":{"admin":true},"safe":"kept"}');
  const legacy = legacyMerge(target, source);
  assert.equal(legacy.admin, true, 'deepmerge 4.3.1 copies the payload into the prototype');

  const result = merge(target, source);
  assert.deepEqual(result, { safe: 'kept' });
  assert.equal(result.admin, undefined);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
});

test('is not affected by CVE-2026-93753 (deepmerge#273)', () => {
  const isAdminPayload = () => JSON.parse('{"__proto__":{"isAdmin":true}}');
  const nested = () => JSON.parse('{"a":{"__proto__":{"isAdmin":true}}}');
  const poisonedElement = Object.setPrototypeOf(isAdminPayload(), null);
  const ownProtoTarget = () =>
    JSON.parse('{"__proto__":{"isAdmin":true},"name":"defaults"}');

  const variants = [
    ['null-prototype target', (run) => run(Object.create(null), isAdminPayload())],
    ['null placeholder', (run) => run({ a: null }, nested()).a],
    ['primitive placeholder', (run) => run({ a: 1 }, nested()).a],
    ['own __proto__ in the target', (run) => run(ownProtoTarget(), { other: 'value' })],
    ['merge.all with a null placeholder', (run) => run.all([{ a: null }, nested()]).a],
    [
      'clone: false into a null-prototype target',
      (run) => run(Object.create(null), isAdminPayload(), { clone: false })
    ]
  ];

  for (const [name, attack] of variants) {
    const legacy = attack(legacyMerge);
    assert.equal(legacy.isAdmin, true, `${name}: deepmerge 4.3.1 is vulnerable`);

    const result = attack(merge);
    assert.equal(Object.getPrototypeOf(result), Object.prototype, name);
    assert.equal(result.isAdmin, undefined, name);
    assert.equal({}.isAdmin, undefined, name);
  }

  const element = merge([], [poisonedElement])[0];
  assert.equal(Object.getPrototypeOf(element), Object.prototype);
  assert.equal(element.isAdmin, undefined);

  const kept = merge(ownProtoTarget(), { other: 'value' });
  assert.deepEqual(kept, { name: 'defaults', other: 'value' });
});

test('keeps constructor and prototype as ordinary data, like the CVE-2026-93753 fix', () => {
  const target = Object.create(null);
  target.constructor = { a: 1 };
  const source = Object.create(null);
  source.constructor = { b: 2 };
  source.prototype = 'value';

  const result = merge(target, source);
  assert.deepEqual(result.constructor, { a: 1, b: 2 });
  assert.equal(result.prototype, 'value');
  assert.equal({}.b, undefined);
});

test('treats constructor and prototype exactly like deepmerge 4.3.1 by default', () => {
  const cases = [
    [{}, JSON.parse('{"constructor":{"prototype":{"polluted":true}},"prototype":{"x":1}}')],
    [JSON.parse('{"constructor":{"own":true}}'), { other: true }],
    [JSON.parse('{"constructor":{"own":true}}'), JSON.parse('{"constructor":{"next":true}}')],
    [Object.create(null), JSON.parse('{"constructor":{"own":true}}')]
  ];
  for (const [target, source] of cases) {
    assert.deepEqual(merge(target, source), legacyMerge(target, source));
  }
  assert.equal(Object.prototype.polluted, undefined);
  assert.equal({}.constructor, Object);
});

test('strict key policy drops all dangerous keys from targets and sources', () => {
  cleanPrototype();
  const target = JSON.parse(
    '{"safeTarget":true,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
  );
  const source = JSON.parse('{"safeSource":true,"prototype":{"polluted":true}}');

  const result = merge(target, source, { unsafeKeys: 'strict' });
  assert.deepEqual(result, { safeTarget: true, safeSource: true });
  assert.equal(Object.prototype.polluted, undefined);
  assertNoOwnKeys(result, dangerousKeys);
});

test('setting onUnsafeKey explicitly selects the strict key policy', () => {
  const source = JSON.parse('{"prototype":{"x":1},"keep":true}');
  assert.deepEqual(merge({}, source, { onUnsafeKey: 'skip' }), { keep: true });
  assert.deepEqual(merge({}, source, { onUnsafeKey: 'skip', unsafeKeys: 'compatible' }), {
    prototype: { x: 1 },
    keep: true
  });
  assert.throws(
    () => merge({}, JSON.parse('{"a":{"__proto__":{}}}'), {
      onUnsafeKey: 'throw',
      unsafeKeys: 'compatible'
    }),
    (error) => error instanceof UnsafeKeyError && error.path === '<root>.a.__proto__'
  );
});

test('does not invoke getters hidden behind rejected unsafe keys', () => {
  for (const [options, blocked] of [
    [undefined, ['__proto__']],
    [{ unsafeKeys: 'strict' }, dangerousKeys]
  ]) {
    const reads = [];
    const source = {};
    for (const key of dangerousKeys) {
      Object.defineProperty(source, key, {
        enumerable: true,
        get() {
          reads.push(key);
          return { polluted: true };
        }
      });
    }

    merge({}, source, options);
    for (const key of blocked) assert.equal(reads.includes(key), false, key);
  }
});

test('throw mode reports the rejected path without partial pollution', () => {
  const source = {
    account: JSON.parse('{"profile":{"constructor":{"prototype":{"admin":true}}}}')
  };

  for (const run of [
    () => merge({}, source, { onUnsafeKey: 'throw' }),
    () => strict({}, source)
  ]) {
    assert.throws(run, (error) => {
      assert.equal(error instanceof UnsafeKeyError, true);
      assert.equal(error.code, 'ERR_DEEPMERGE_UNSAFE_KEY');
      assert.equal(error.key, 'constructor');
      assert.equal(error.path, '<root>.account.profile.constructor');
      return true;
    });
  }
  assert.equal(Object.prototype.admin, undefined);
});

test('ignores inherited properties and polluted prototype gadgets', () => {
  Object.prototype.stacklineInherited = { shouldNotAppear: true };
  try {
    const source = { own: true, stacklineInherited: 'attacker override' };
    const result = merge({}, source);
    assert.deepEqual(Object.keys(result), ['own']);
    assert.equal(Object.prototype.hasOwnProperty.call(result, 'stacklineInherited'), false);
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
  assert.equal(Object.prototype.hasOwnProperty.call(result, '__proto__'), false);
  assert.equal({}.polluted, undefined);
});

test('writes keys that shadow Object.prototype members as own data properties', () => {
  const target = { toString: { left: true }, valueOf: 1 };
  const source = { toString: { right: true }, valueOf: 2 };
  const result = merge(target, source);
  assert.deepEqual(result.toString, { left: true, right: true });
  assert.equal(result.valueOf, 2);
  assert.equal(typeof Object.prototype.toString, 'function');
});

test('keeps symbols whose descriptions resemble unsafe string keys', () => {
  const protoSymbol = Symbol('__proto__');
  const constructorSymbol = Symbol('constructor');
  const source = {
    [protoSymbol]: { safe: true },
    [constructorSymbol]: { safe: true }
  };

  const result = strict({}, source);
  assert.deepEqual(result[protoSymbol], { safe: true });
  assert.deepEqual(result[constructorSymbol], { safe: true });
  assert.equal(Object.prototype.polluted, undefined);
});

function assertNoOwnKeys(value, keys, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const key of keys) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(value, key),
      false,
      `unexpected own key ${key}`
    );
  }
  for (const nested of Object.values(value)) assertNoOwnKeys(nested, keys, seen);
}

function assertPlainPrototypes(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  const expected = Array.isArray(value) ? Array.prototype : Object.prototype;
  assert.equal(Object.getPrototypeOf(value), expected);
  for (const nested of Object.values(value)) assertPlainPrototypes(nested, seen);
}
