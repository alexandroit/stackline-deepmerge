import assert from 'node:assert/strict';
import test from 'node:test';

import legacyMerge from 'deepmerge';
import merge from '../src/index.js';
import {
  assertSameGraph,
  collectReferences,
  createRandom,
  fingerprint,
  outcome
} from './support/graph.mjs';

const symbolA = Symbol('a');
const symbolB = Symbol('b');
const keyPool = [
  'a',
  'b',
  'c',
  'd',
  'list',
  '0',
  '1',
  '10',
  'x-y',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'constructor',
  'prototype',
  symbolA,
  symbolB
];

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const overwrite = (_target, source) => source;
const cloneSource = (_target, source, options) =>
  source.map((value) => options.cloneUnlessOtherwiseSpecified(value, options));
const isPlain = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

// Each factory receives the implementation under test and returns fresh
// options, because deepmerge 4.3.1 writes defaults into the caller's object.
const optionVariants = [
  ['no options', () => undefined],
  ['null options', () => null],
  ['empty options', () => ({})],
  ['clone false', () => ({ clone: false })],
  ['overwrite arrays', () => ({ arrayMerge: overwrite })],
  ['cloning array hook', () => ({ arrayMerge: cloneSource })],
  ['falsy hooks', () => ({ arrayMerge: null, isMergeableObject: false, customMerge: 0 })],
  ['plain-object predicate', () => ({ isMergeableObject: isPlain })],
  ['inherited options', () => Object.create({ arrayMerge: overwrite, clone: false })],
  [
    'custom merge by key',
    (implementation) => ({
      customMerge(key) {
        if (key === 'a') return (left, right) => [left, right];
        if (key === 'b') return (left, right, options) => implementation(right, left, options);
        return undefined;
      }
    })
  ]
];

function generate(random) {
  const pool = [];

  function remember(value) {
    pool.push(value);
    return value;
  }

  function primitive() {
    const choice = Math.floor(random() * 10);
    if (choice === 0) return null;
    if (choice === 1) return undefined;
    if (choice === 2) return random() > 0.5;
    if (choice === 3) return Math.floor(random() * 200) - 100;
    if (choice === 4) return -0;
    if (choice === 5) return Number.NaN;
    if (choice === 6) return symbolA;
    if (choice === 7) return 10n;
    return `text-${Math.floor(random() * 20)}`;
  }

  function value(depth) {
    if (pool.length > 0 && random() < 0.12) {
      return pool[Math.floor(random() * pool.length)];
    }
    const choice = depth >= 4 ? Math.floor(random() * 4) : Math.floor(random() * 16);
    if (choice <= 2) return primitive();
    if (choice === 3) return remember(new Date(Math.floor(random() * 1e12)));
    if (choice === 4) return remember(/stack(line)?/g);
    if (choice === 5) {
      return remember({ $$typeof: Symbol.for('react.element'), type: 'span', props: {} });
    }
    if (choice === 6) return remember(new Point(random(), random()));
    if (choice === 7) return remember(new Map([['key', depth]]));
    if (choice === 8) return remember(new Set([depth]));
    if (choice === 9) {
      const target = Object.create(null);
      fill(target, depth);
      return remember(target);
    }
    if (choice === 10 || choice === 11) return remember(array(depth));
    return remember(object(depth));
  }

  function array(depth) {
    const length = Math.floor(random() * 4);
    const output = [];
    output.length = length;
    for (let index = 0; index < length; index += 1) {
      if (random() < 0.15) continue;
      output[index] = value(depth + 1);
    }
    return output;
  }

  function fill(target, depth) {
    const count = Math.floor(random() * 5);
    for (let index = 0; index < count; index += 1) {
      const key = keyPool[Math.floor(random() * keyPool.length)];
      if (random() < 0.08) {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: false,
          value: value(depth + 1),
          writable: true
        });
      } else {
        target[key] = value(depth + 1);
      }
    }
    return target;
  }

  function object(depth) {
    return fill({}, depth);
  }

  function root() {
    const choice = random();
    if (choice < 0.7) return object(0);
    if (choice < 0.85) return array(0);
    if (choice < 0.9) return Object.assign(Object.create(null), object(0));
    return value(1);
  }

  return { root };
}

function compareMerge(label, run) {
  const legacy = outcome(() => run(legacyMerge));
  const current = outcome(() => run(merge));
  if (!legacy.ok) {
    assert.equal(current.ok, false, `${label}: deepmerge 4.3.1 threw but Stackline returned`);
    assert.equal(current.error.constructor.name, legacy.error.constructor.name, label);
    return;
  }
  assert.equal(current.ok, true, `${label}: Stackline threw ${current.ok || current.error}`);
  return [current.value, legacy.value];
}

const corpusSize = Number(process.env.DEEPMERGE_DIFF_CASES || 1500);
const corpusSeed = Number(process.env.DEEPMERGE_DIFF_SEED || 0x5a17c0de);

test('matches deepmerge 4.3.1 exactly across a mixed-type differential corpus', () => {
  const random = createRandom(corpusSeed);
  let compared = 0;

  for (let index = 0; index < corpusSize; index += 1) {
    const generator = generate(random);
    const target = generator.root();
    const source = generator.root();
    const extra = generator.root();
    const inputs = collectReferences(target, source, extra);
    const before = fingerprint([target, source, extra]);

    for (const [name, createOptions] of optionVariants) {
      const label = `case ${index} (${name})`;
      const pair = compareMerge(label, (implementation) =>
        implementation(target, source, createOptions(implementation))
      );
      if (pair) assertSameGraph(pair[0], pair[1], inputs, label);

      const many = compareMerge(`${label} all`, (implementation) =>
        implementation.all([target, source, extra], createOptions(implementation))
      );
      if (many) assertSameGraph(many[0], many[1], inputs, `${label} all`);
      compared += 2;
    }

    assert.equal(fingerprint([target, source, extra]), before, `case ${index} mutated input`);
  }

  assert.equal(compared, corpusSize * optionVariants.length * 2);
});

test('matches deepmerge 4.3.1 for documented README scenarios', () => {
  const scenarios = [
    [
      { foo: { bar: 3 }, array: [{ works: true, values: [1, 2] }] },
      { foo: { baz: 4 }, array: [{ values: [3, 4] }, { more: true }] }
    ],
    [{ value: null, nested: { left: true } }, { value: 0, nested: { right: true } }],
    [{ list: [1, 2], flag: true }, { list: [3], flag: false }],
    [{ nullable: { value: true } }, { nullable: null }],
    [{ text: 'left' }, { text: { nested: 'right' } }],
    [{ text: { nested: 'left' } }, { text: 'right' }],
    [{ a: 1, b: 2, c: 3 }, { b: 20, d: 4, a: 10 }]
  ];

  for (const [index, [target, source]] of scenarios.entries()) {
    const inputs = collectReferences(target, source);
    assertSameGraph(merge(target, source), legacyMerge(target, source), inputs, `scenario ${index}`);
    assert.equal(
      JSON.stringify(merge(target, source)),
      JSON.stringify(legacyMerge(target, source)),
      `scenario ${index} serialization`
    );
  }
});

test('keeps deepmerge 4.3.1 key order when the source overrides a key', () => {
  const target = { first: 1, second: 2, third: { nested: true } };
  const source = { third: { added: true }, first: 10, fourth: 4 };
  assert.deepEqual(Object.keys(merge(target, source)), Object.keys(legacyMerge(target, source)));
  assert.deepEqual(Object.keys(merge(target, source)), ['first', 'second', 'third', 'fourth']);
});

test('returns independent copies for shared references like deepmerge 4.3.1', () => {
  const shared = { value: 1 };
  const result = merge({}, { left: shared, right: shared });
  assert.notEqual(result.left, result.right);
  result.left.value = 2;
  assert.equal(result.right.value, 1);

  const target = { config: { retries: 1 } };
  const source = { config: { timeout: 5 }, copy: target.config };
  const merged = merge(target, source);
  assert.deepEqual(merged.copy, { retries: 1 });
  assert.deepEqual(merged, legacyMerge(target, source));
});

test('calls customMerge with the same keys in the same order as deepmerge 4.3.1', () => {
  const random = createRandom(0xc0ffee);
  for (let index = 0; index < 300; index += 1) {
    const generator = generate(random);
    const target = generator.root();
    const source = generator.root();
    const calls = [[], []];
    const run = (implementation, log) =>
      outcome(() =>
        implementation(target, source, {
          customMerge(key) {
            log.push(String(key));
            return undefined;
          }
        })
      );
    run(legacyMerge, calls[0]);
    run(merge, calls[1]);
    assert.deepEqual(calls[1], calls[0], `case ${index}`);
  }
});

test('accepts the same loose option shapes as deepmerge 4.3.1', () => {
  for (const options of [undefined, null, false, 0, '']) {
    assert.deepEqual(merge({ a: [1] }, { a: [2] }, options), { a: [1, 2] });
  }
  for (const options of [{ arrayMerge: null }, { arrayMerge: false }, { isMergeableObject: 0 }]) {
    assert.deepEqual(merge({ a: [1] }, { a: [2] }, options), { a: [1, 2] });
  }
  assert.deepEqual(merge({ a: 1 }, { b: 2 }, { customMerge: null }), { a: 1, b: 2 });
  assert.deepEqual(merge({ a: 1 }, { b: 2 }, { arrayMerge: 'unused' }), { a: 1, b: 2 });
  assert.throws(() => merge({ a: [1] }, { a: [2] }, { arrayMerge: 'invalid' }), TypeError);
  assert.throws(() => legacyMerge({ a: [1] }, { a: [2] }, { arrayMerge: 'invalid' }), TypeError);
  assert.throws(() => merge({}, {}, 'invalid'), TypeError);
  assert.throws(() => legacyMerge({}, {}, 'invalid'), TypeError);
});
