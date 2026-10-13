import assert from 'node:assert/strict';
import test from 'node:test';

import legacyMerge from 'deepmerge';
import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  concatUniqueArrays,
  createDeepmerge,
  isMergeableObject,
  isPlainMergeableObject,
  mergeArraysByIndex,
  mergeArraysByKey,
  overwriteArrays,
  strict,
  strictOptions
} from '../src/index.js';

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

function reactElement(marker, type, props) {
  return { $$typeof: Symbol.for(marker), type, key: null, props, _owner: null };
}

test('keeps React 19 elements opaque (deepmerge#265)', () => {
  const previous = reactElement('react.transitional.element', 'div', { className: 'old' });
  const next = reactElement('react.transitional.element', 'button', { children: 'new' });

  const result = merge({ child: previous, list: [previous] }, { child: next, list: [next] });
  assert.equal(result.child, next);
  assert.deepEqual(result.child.props, { children: 'new' });
  assert.equal(result.list[0], previous);
  assert.equal(result.list[1], next);
  assert.equal(isMergeableObject(next), false);
  assert.equal(isMergeableObject(reactElement('react.element', 'span', {})), false);
});

test('strict applies the hardened preset and accepts per-call overrides', () => {
  assert.deepEqual(strictOptions, {
    maxDepth: 1000,
    maxKeys: 100000,
    onUnsafeKey: 'throw',
    unsafeKeys: 'strict'
  });
  assert.equal(Object.isFrozen(strictOptions), true);

  assert.deepEqual(strict({ a: { b: 1 } }, { a: { c: 2 } }), { a: { b: 1, c: 2 } });
  assert.throws(() => strict({}, JSON.parse('{"prototype":{}}')), UnsafeKeyError);
  assert.throws(() => strict({}, { a: { b: 1 } }, { maxDepth: 0 }), DeepMergeLimitError);
  assert.deepEqual(
    strict({}, JSON.parse('{"prototype":{},"keep":1}'), { onUnsafeKey: 'skip' }),
    { keep: 1 }
  );
  assert.deepEqual(strict.all([{ a: 1 }, { b: 2 }, { c: 3 }]), { a: 1, b: 2, c: 3 });
});

test('createDeepmerge builds reusable configured merge functions', () => {
  const replaceArrays = createDeepmerge({ arrayMerge: overwriteArrays });
  assert.deepEqual(replaceArrays({ list: [1, 2] }, { list: [3] }), { list: [3] });
  assert.deepEqual(replaceArrays({ list: [1] }, { list: [2] }, null), { list: [2] });
  assert.deepEqual(
    replaceArrays({ list: [1] }, { list: [2] }, { arrayMerge: concatUniqueArrays }),
    { list: [1, 2] }
  );
  assert.deepEqual(
    replaceArrays({ list: [1] }, { list: [2] }, Object.create({ arrayMerge: null })),
    { list: [1, 2] }
  );
  assert.deepEqual(replaceArrays.all([{ list: [1] }, { list: [2] }, { list: [3] }]), {
    list: [3]
  });

  const defaults = { clone: false };
  const shallow = createDeepmerge(defaults);
  const nested = { value: true };
  assert.equal(shallow({}, { nested }).nested, nested);
  assert.deepEqual(defaults, { clone: false });

  assert.deepEqual(createDeepmerge()({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
  assert.throws(() => createDeepmerge({ maxDepth: -1 }), /maxDepth must be/);
  assert.throws(() => createDeepmerge('invalid'), /options must be an object/);
  assert.throws(() => replaceArrays({}, {}, 'invalid'), /options must be an object/);
});

test('isPlainMergeableObject keeps class instances and built-ins intact (deepmerge#152, #208, #256)', () => {
  assert.equal(isPlainMergeableObject({}), true);
  assert.equal(isPlainMergeableObject(Object.create(null)), true);
  assert.equal(isPlainMergeableObject([]), true);
  for (const value of [
    new Point(1, 2),
    new Map(),
    new Set(),
    new Date(),
    /x/,
    reactElement('react.element', 'span', {}),
    null,
    'text',
    1
  ]) {
    assert.equal(isPlainMergeableObject(value), false, String(value));
  }

  const point = new Point(1, 2);
  const result = merge(
    { shape: { color: 'red' }, points: [] },
    { shape: point, points: [point] },
    { isMergeableObject: isPlainMergeableObject }
  );
  assert.equal(result.shape, point);
  assert.equal(result.points[0], point);
  assert.equal(result.shape instanceof Point, true);
});

test('mergeCollections merges and clones Map and Set values (deepmerge#202, #204)', () => {
  const shared = { id: 1 };
  const target = {
    users: new Map([
      ['ada', { roles: ['reader'] }],
      ['grace', { active: true }]
    ]),
    tags: new Set(['a', shared])
  };
  const source = {
    users: new Map([
      ['ada', { roles: ['writer'] }],
      ['linus', { active: false }]
    ]),
    tags: new Set(['b', shared, 'a'])
  };

  const result = merge(target, source, { mergeCollections: true });
  assert.equal(result.users instanceof Map, true);
  assert.deepEqual([...result.users.keys()], ['ada', 'grace', 'linus']);
  assert.deepEqual(result.users.get('ada'), { roles: ['reader', 'writer'] });
  assert.notEqual(result.users.get('grace'), target.users.get('grace'));
  assert.equal(result.tags instanceof Set, true);
  assert.deepEqual([...result.tags].slice(0, 1), ['a']);
  assert.equal(result.tags.size, 3);
  assert.equal([...result.tags].includes(shared), false);
  assert.equal(target.users.get('ada').roles.length, 1);

  const cloned = merge({}, { map: target.users }, { mergeCollections: true });
  assert.notEqual(cloned.map, target.users);
  assert.deepEqual([...cloned.map.keys()], ['ada', 'grace']);

  const replaced = merge({ value: new Set([1]) }, { value: new Map([[1, 2]]) }, {
    mergeCollections: true
  });
  assert.equal(replaced.value instanceof Map, true);
  const replacedBySet = merge({ value: new Map() }, { value: new Set([1]) }, {
    mergeCollections: true
  });
  assert.deepEqual([...replacedBySet.value], [1]);
  const clonedSet = merge({}, { value: new Set([{ a: 1 }]) }, { mergeCollections: true });
  assert.equal(clonedSet.value instanceof Set, true);
  assert.deepEqual([...clonedSet.value], [{ a: 1 }]);

  const top = merge(new Map([['a', 1]]), new Map([['b', 2]]), { mergeCollections: true });
  assert.deepEqual([...top], [['a', 1], ['b', 2]]);

  const plain = merge({}, { map: target.users });
  assert.deepEqual(plain.map, {}, 'default behavior stays deepmerge-compatible');
  assert.deepEqual(plain, legacyMerge({}, { map: target.users }));

  const byReference = merge({}, { map: target.users }, { mergeCollections: true, clone: false });
  assert.equal(byReference.map, target.users);

  const cyclic = new Map();
  cyclic.set('self', cyclic);
  const copy = merge(new Map(), cyclic, { mergeCollections: true });
  assert.equal(copy.get('self'), copy);

  const spoofed = { [Symbol.toStringTag]: 'Map', size: 0 };
  const spoofedSet = { [Symbol.toStringTag]: 'Set' };
  const notCollections = merge({}, { spoofed, spoofedSet }, { mergeCollections: true });
  assert.equal(notCollections.spoofed instanceof Map, false);
  assert.equal(notCollections.spoofed.size, 0);
  assert.notEqual(notCollections.spoofed, spoofed);
  assert.equal(notCollections.spoofedSet instanceof Set, false);
});

test('skipUndefined keeps existing target values (deepmerge#242)', () => {
  const target = { name: 'Ada', nested: { port: 80 }, list: ['a'] };
  const source = { name: undefined, nested: { port: undefined, host: 'x' }, extra: undefined };
  const result = merge(target, source, { skipUndefined: true });
  assert.deepEqual(result, {
    name: 'Ada',
    nested: { port: 80, host: 'x' },
    list: ['a'],
    extra: undefined
  });
  assert.deepEqual(Object.keys(result), ['name', 'nested', 'list', 'extra']);
  assert.equal(merge(target, source).name, undefined);

  const maps = merge(
    { map: new Map([['a', 1], ['b', 2]]) },
    { map: new Map([['a', undefined], ['c', undefined]]) },
    { mergeCollections: true, skipUndefined: true }
  );
  assert.deepEqual([...maps.map], [['a', 1], ['b', 2], ['c', undefined]]);

  const byIndex = merge({ list: [1, 2] }, { list: [undefined, 3, 4] }, {
    arrayMerge: mergeArraysByIndex,
    skipUndefined: true
  });
  assert.deepEqual(byIndex.list, [1, 3, 4]);
});

test("customMergeScope 'all' lets customMerge handle primitive values (deepmerge#216, #184)", () => {
  const options = {
    customMergeScope: 'all',
    customMerge: (key) => (key === 'shares' ? (left, right) => left + right : undefined)
  };
  const result = merge(
    { ada: { shares: 3, name: 'Ada' }, total: { shares: 10 } },
    { ada: { shares: 2, name: 'Ada L.' }, total: { shares: 5 } },
    options
  );
  assert.deepEqual(result, {
    ada: { shares: 5, name: 'Ada L.' },
    total: { shares: 15 }
  });
  assert.deepEqual(merge({ shares: 3 }, { shares: 2 }, { customMerge: options.customMerge }), {
    shares: 2
  });
});

test('customMerge receives the path and both values (deepmerge#263)', () => {
  const contexts = [];
  merge(
    { settings: { theme: { dark: true } } },
    { settings: { theme: { contrast: 'high' } } },
    {
      customMerge(key, options, context) {
        assert.equal(typeof options.cloneUnlessOtherwiseSpecified, 'function');
        contexts.push({ key, path: context.path, target: context.target, source: context.source });
        return undefined;
      }
    }
  );
  assert.deepEqual(contexts, [
    {
      key: 'settings',
      path: ['settings'],
      target: { theme: { dark: true } },
      source: { theme: { contrast: 'high' } }
    },
    {
      key: 'theme',
      path: ['settings', 'theme'],
      target: { dark: true },
      source: { contrast: 'high' }
    }
  ]);
});

test('array strategies replace, merge by index, or deduplicate (deepmerge#190)', () => {
  const item = { id: 1 };
  const overwritten = merge({ list: [1, 2] }, { list: [item] }, { arrayMerge: overwriteArrays });
  assert.deepEqual(overwritten.list, [{ id: 1 }]);
  assert.notEqual(overwritten.list[0], item);

  const sparse = [];
  sparse.length = 3;
  sparse[2] = { c: 3 };
  const byIndex = merge(
    { list: [{ a: 1 }, { b: 1 }, 'keep', 'tail'] },
    { list: [{ a: 2, x: true }, 'replace'].concat(sparse.slice(2)) },
    { arrayMerge: mergeArraysByIndex }
  );
  assert.deepEqual(byIndex.list, [{ a: 2, x: true }, 'replace', { c: 3 }, 'tail']);

  const holes = mergeArraysByIndex([, 'left'], [, , 'right']);
  assert.equal(0 in holes, false);
  assert.deepEqual(holes.slice(1), ['left', 'right']);

  const unique = merge(
    { list: [1, 'a', item, Number.NaN] },
    { list: [1, 'b', item, Number.NaN, { id: 1 }] },
    { arrayMerge: concatUniqueArrays }
  );
  assert.equal(unique.list.length, 6);
  assert.deepEqual(unique.list.slice(0, 2), [1, 'a']);
  assert.equal(Number.isNaN(unique.list[3]), true);
  assert.deepEqual(concatUniqueArrays([1, , 2], [2, 3]), [1, 2, 3]);
  assert.deepEqual(overwriteArrays([1], [2, { a: 1 }]), [2, { a: 1 }]);
});

test('mergeArraysByKey merges items that share an identifier', () => {
  const byName = mergeArraysByKey('name');
  const result = merge(
    {
      plugins: [
        { name: 'core', options: { retries: 1 } },
        { name: 'cache', enabled: true },
        'loose',
        { options: {} }
      ]
    },
    {
      plugins: [
        { name: 'cache', enabled: false },
        { name: 'metrics' },
        { name: 'core', options: { timeout: 5 } },
        { name: 'metrics', interval: 30 },
        'loose'
      ]
    },
    { arrayMerge: byName }
  );
  assert.deepEqual(result.plugins, [
    { name: 'core', options: { retries: 1, timeout: 5 } },
    { name: 'cache', enabled: false },
    'loose',
    { options: {} },
    { name: 'metrics', interval: 30 },
    'loose'
  ]);

  const byFunction = mergeArraysByKey((item) => item.id.toLowerCase());
  const sparse = [{ id: 'A', left: true }];
  sparse.length = 2;
  assert.deepEqual(byFunction(sparse, [{ id: 'a', right: true }]), [
    { id: 'a', left: true, right: true }
  ]);

  const duplicates = mergeArraysByKey(0)([[1, 'first'], [1, 'second']], [[1, 'third']]);
  assert.deepEqual(duplicates, [[1, 'first', 1, 'third'], [1, 'second']]);

  const symbol = Symbol('id');
  assert.equal(mergeArraysByKey(symbol)([{ [symbol]: 1 }], [{ [symbol]: 1 }]).length, 1);
  assert.throws(() => mergeArraysByKey({}), /expects a property key or a function/);
  assert.deepEqual(
    legacyMerge({ list: [{ id: 1, a: 1 }] }, { list: [{ id: 1, b: 2 }] }, {
      arrayMerge: mergeArraysByKey('id')
    }),
    { list: [{ id: 1, a: 1, b: 2 }] }
  );
});

test('array strategies also work as hooks for deepmerge 4.3.1', () => {
  assert.deepEqual(legacyMerge({ list: [1] }, { list: [2] }, { arrayMerge: overwriteArrays }), {
    list: [2]
  });
  assert.deepEqual(
    legacyMerge({ list: [1, 2] }, { list: [2, 3] }, { arrayMerge: concatUniqueArrays }),
    { list: [1, 2, 3] }
  );
  assert.deepEqual(
    legacyMerge({ list: [{ a: 1 }] }, { list: [{ b: 2 }] }, { arrayMerge: mergeArraysByIndex }),
    { list: [{ a: 1, b: 2 }] }
  );
});

test('callbacks that recover from errors leave the merge state consistent', () => {
  const deep = { one: { two: { three: true } } };
  const result = merge(
    { safe: { left: true }, risky: { value: 1 } },
    { safe: { right: true }, risky: { value: 2 } },
    {
      maxDepth: 2,
      customMerge(key) {
        if (key !== 'risky') return undefined;
        return (_left, _right, options) => {
          try {
            return options.cloneUnlessOtherwiseSpecified(deep, options);
          } catch (error) {
            assert.equal(error instanceof DeepMergeLimitError, true);
            return 'fallback';
          }
        };
      }
    }
  );
  assert.deepEqual(result, { safe: { left: true, right: true }, risky: 'fallback' });

  const nested = merge({ list: [] }, { list: [{ a: 1 }] }, {
    arrayMerge: (target, source, options) =>
      source.map((value) => options.cloneUnlessOtherwiseSpecified(value, { clone: false }))
  });
  assert.equal(nested.list.length, 1);
});
