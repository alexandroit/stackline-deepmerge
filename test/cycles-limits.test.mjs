import assert from 'node:assert/strict';
import test from 'node:test';

import merge, { DeepMergeLimitError, strict } from '../src/index.js';

test('preserves object self references when merging into an empty object', () => {
  const source = { name: 'source' };
  source.self = source;

  const result = merge({}, source);
  assert.equal(result.name, 'source');
  assert.equal(result.self, result);
  assert.notEqual(result, source);

  const combined = merge.all([source]);
  assert.equal(combined.self, combined);
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

test('copies a cyclic target branch into a closed cycle', () => {
  const target = { name: 'target' };
  target.self = target;

  const result = merge(target, { extra: true });
  assert.equal(result.extra, true);
  assert.equal(result.self.name, 'target');
  assert.equal(result.self.self, result.self);
  assert.notEqual(result.self, target);
});

test('preserves mutual cycles while copying repeated references independently', () => {
  const first = { name: 'first' };
  const second = { name: 'second', first };
  first.second = second;
  const source = { first, again: first };

  const result = merge({}, source);
  assert.equal(result.first.second.first, result.first);
  assert.equal(result.again.second.first, result.again);
  assert.notEqual(result.first, result.again);
  assert.notEqual(result.first, first);
});

test('never reuses a merged branch for a later copy of the same input object', () => {
  const shared = { left: true };
  const result = merge({ branch: shared }, { branch: { right: true }, copy: shared });
  assert.deepEqual(result, {
    branch: { left: true, right: true },
    copy: { left: true }
  });
});

test('preserves cycles inside custom array hooks and nested clones', () => {
  const source = { list: [] };
  source.list.push(source);
  const result = merge({}, source, {
    arrayMerge: (_target, list, options) =>
      list.map((value) => options.cloneUnlessOtherwiseSpecified(value, options))
  });
  assert.equal(result.list[0].list[0], result.list[0]);
});

test('has no depth or key limit by default, like deepmerge 4.3.1', () => {
  let source = { leaf: true };
  for (let depth = 0; depth < 1200; depth += 1) source = { next: source };

  let result = merge({}, source);
  for (let depth = 0; depth < 1200; depth += 1) result = result.next;
  assert.deepEqual(result, { leaf: true });

  const wide = {};
  for (let index = 0; index < 120000; index += 1) wide[`key${index}`] = index;
  assert.equal(Object.keys(merge({}, wide)).length, 120000);
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

test('strict mode rejects extremely deep input before stack overflow', () => {
  let source = { leaf: true };
  for (let depth = 0; depth < 2500; depth += 1) source = { next: source };

  assert.throws(
    () => strict({}, source),
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

test('applies limits to arrays, custom hooks, and collections', () => {
  assert.throws(
    () => merge({}, { list: [[[1]]] }, { maxDepth: 2 }),
    (error) => error instanceof DeepMergeLimitError && error.path === '<root>.list[0][0]'
  );
  assert.throws(
    () =>
      merge({}, { list: [{ deep: { deeper: true } }] }, {
        maxDepth: 2,
        arrayMerge: (_target, list, options) =>
          list.map((value) => options.cloneUnlessOtherwiseSpecified(value, options))
      }),
    DeepMergeLimitError
  );
  assert.throws(
    () =>
      merge({}, { map: new Map([['a', 1], ['b', 2]]) }, { mergeCollections: true, maxKeys: 2 }),
    (error) => error.kind === 'key'
  );
});

test('allows explicit infinite limits', () => {
  assert.deepEqual(
    merge({ one: 1 }, { nested: { two: 2 } }, { maxDepth: Infinity, maxKeys: Infinity }),
    { one: 1, nested: { two: 2 } }
  );
});

test('formats array, symbol, map-key, and non-identifier paths in limit errors', () => {
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

  const objectKey = {};
  const map = new Map([
    [objectKey, { deep: { value: 1 } }],
    [true, { deep: { value: 2 } }]
  ]);
  assert.throws(
    () => merge({}, { map }, { maxDepth: 2, mergeCollections: true }),
    (error) => error.path === '<root>.map[object].deep'
  );
  map.delete(objectKey);
  assert.throws(
    () => merge({}, { map }, { maxDepth: 2, mergeCollections: true }),
    (error) => error.path === '<root>.map[true].deep'
  );
});
