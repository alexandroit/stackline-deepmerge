import assert from 'node:assert/strict';
import test from 'node:test';

import legacyMerge from 'deepmerge';
import merge from '../src/index.js';

test('matches deepmerge 4.3.1 for documented compatibility scenarios', () => {
  const scenarios = [
    [
      { foo: { bar: 3 }, array: [{ works: true, values: [1, 2] }] },
      { foo: { baz: 4 }, array: [{ values: [3, 4] }, { more: true }] }
    ],
    [{ value: null, nested: { left: true } }, { value: 0, nested: { right: true } }],
    [{ list: [1, 2], flag: true }, { list: [3], flag: false }],
    [{ nullable: { value: true } }, { nullable: null }],
    [{ text: 'left' }, { text: { nested: 'right' } }],
    [{ text: { nested: 'left' } }, { text: 'right' }]
  ];

  for (const [target, source] of scenarios) {
    assert.deepEqual(merge(target, source), legacyMerge(target, source));
  }
});

test('matches deepmerge 4.3.1 for clone and documented extension hooks', () => {
  const nested = { value: true };
  assert.deepEqual(
    merge({}, { nested }, { clone: false }),
    legacyMerge({}, { nested }, { clone: false })
  );

  const overwrite = (_target, source) => source;
  assert.deepEqual(
    merge({ list: [1, 2] }, { list: [3] }, { arrayMerge: overwrite }),
    legacyMerge({ list: [1, 2] }, { list: [3] }, { arrayMerge: overwrite })
  );

  const options = {
    customMerge(key) {
      return key === 'name'
        ? (left, right) => `${left.first}/${right.first}`
        : undefined;
    }
  };
  const target = { name: { first: 'Ada' }, roles: ['reader'] };
  const source = { name: { first: 'Grace' }, roles: ['writer'] };
  assert.deepEqual(merge(target, source, options), legacyMerge(target, source, options));
});

test('matches deepmerge 4.3.1 across a deterministic JSON-compatible corpus', () => {
  const random = createRandom(0x5a17c0de);
  for (let index = 0; index < 5000; index += 1) {
    const target = randomRecord(random, 0);
    const source = randomRecord(random, 0);
    const actual = merge(target, source);
    const expected = legacyMerge(target, source);
    assert.deepEqual(actual, expected, `differential case ${index}`);
  }
});

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function randomRecord(random, depth) {
  const output = {};
  const count = Math.floor(random() * 5);
  for (let index = 0; index < count; index += 1) {
    output[`key${Math.floor(random() * 9)}`] = randomValue(random, depth + 1);
  }
  return output;
}

function randomValue(random, depth) {
  const choice = depth >= 4 ? Math.floor(random() * 5) : Math.floor(random() * 8);
  if (choice === 0) return null;
  if (choice === 1) return random() > 0.5;
  if (choice === 2) return Math.floor(random() * 1000) - 500;
  if (choice === 3) return `value-${Math.floor(random() * 30)}`;
  if (choice === 4) return undefined;
  if (choice === 5) return randomRecord(random, depth);
  if (choice === 6) {
    return Array.from({ length: Math.floor(random() * 4) }, () =>
      randomValue(random, depth + 1)
    );
  }
  return { nested: randomRecord(random, depth + 1) };
}
