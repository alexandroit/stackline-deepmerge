import assert from 'node:assert/strict';
import test from 'node:test';

import merge, { DeepMergeLimitError } from '../src/index.js';

test('preserves object self references', () => {
  const source = { name: 'source' };
  source.self = source;

  const result = merge({}, source);
  assert.equal(result.name, 'source');
  assert.equal(result.self, result);
});

test('merges two cyclic roots into one stable cycle', () => {
  const target = { target: true };
  const source = { source: true };
  target.self = target;
  source.self = source;

  const result = merge(target, source);
  assert.deepEqual({ target: result.target, source: result.source }, {
    target: true,
    source: true
  });
  assert.equal(result.self, result);
});

test('preserves array self references', () => {
  const source = ['first'];
  source.push(source);

  const result = merge([], source);
  assert.equal(result[0], 'first');
  assert.equal(result[1], result);
});

test('preserves mutual cycles and shared references', () => {
  const first = { name: 'first' };
  const second = { name: 'second', first };
  first.second = second;
  const source = { first, again: first };

  const result = merge({}, source);
  assert.equal(result.first, result.again);
  assert.equal(result.first.second.first, result.first);
});

test('enforces maxDepth with a structured error', () => {
  const source = { one: { two: { three: { four: true } } } };
  assert.throws(
    () => merge({}, source, { maxDepth: 2 }),
    (error) => {
      assert.equal(error instanceof DeepMergeLimitError, true);
      assert.equal(error.code, 'ERR_DEEPMERGE_LIMIT');
      assert.equal(error.kind, 'depth');
      assert.equal(error.limit, 2);
      assert.match(error.path, /one\.two\.three/);
      return true;
    }
  );
});

test('rejects extremely deep input with a controlled error before stack overflow', () => {
  let source = { leaf: true };
  for (let depth = 0; depth < 2500; depth += 1) source = { next: source };

  assert.throws(
    () => merge({}, source),
    (error) => {
      assert.equal(error instanceof DeepMergeLimitError, true);
      assert.equal(error.kind, 'depth');
      assert.equal(error.limit, 1000);
      assert.equal(error.path.startsWith('<root>.next.next'), true);
      return true;
    }
  );
});

test('enforces maxKeys across the full merge', () => {
  assert.throws(
    () => merge({ one: 1, two: 2 }, { three: 3, four: 4 }, { maxKeys: 3 }),
    (error) => {
      assert.equal(error instanceof DeepMergeLimitError, true);
      assert.equal(error.kind, 'key');
      assert.equal(error.limit, 3);
      assert.equal(error.path, '<root>');
      return true;
    }
  );
});

test('allows explicit infinite limits', () => {
  assert.deepEqual(
    merge({ one: 1 }, { nested: { two: 2 } }, { maxDepth: Infinity, maxKeys: Infinity }),
    { one: 1, nested: { two: 2 } }
  );
});

test('formats array, symbol, and non-identifier paths in limit errors', () => {
  assert.throws(
    () => merge({}, { list: [{ nested: { value: true } }] }, { maxDepth: 2 }),
    (error) => {
      assert.match(error.path, /\.list\[0\]\.nested/);
      return true;
    }
  );

  const symbol = Symbol('config');
  assert.throws(
    () => merge({}, { [symbol]: { nested: { value: true } } }, { maxDepth: 1 }),
    (error) => {
      assert.match(error.path, /\[Symbol\(config\)\]\.nested/);
      return true;
    }
  );

  assert.throws(
    () => merge({}, { 'feature-flags': { nested: { value: true } } }, { maxDepth: 1 }),
    (error) => {
      assert.match(error.path, /\["feature-flags"\]\.nested/);
      return true;
    }
  );
});
