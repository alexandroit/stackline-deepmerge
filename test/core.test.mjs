import assert from 'node:assert/strict';
import test from 'node:test';

import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  all,
  concatUniqueArrays,
  createDeepmerge,
  deepmerge,
  isMergeableObject,
  isPlainMergeableObject,
  mergeArraysByIndex,
  mergeArraysByKey,
  overwriteArrays,
  strict,
  strictOptions
} from '../src/index.js';

test('merges nested objects and concatenates arrays without mutation', () => {
  const target = {
    user: { name: 'Ada', roles: ['reader'] },
    enabled: false
  };
  const source = {
    user: { active: true, roles: ['writer'] },
    enabled: true
  };

  const result = merge(target, source);

  assert.deepEqual(result, {
    user: {
      name: 'Ada',
      active: true,
      roles: ['reader', 'writer']
    },
    enabled: true
  });
  assert.deepEqual(target, {
    user: { name: 'Ada', roles: ['reader'] },
    enabled: false
  });
  assert.deepEqual(source, {
    user: { active: true, roles: ['writer'] },
    enabled: true
  });
  assert.notEqual(result, target);
  assert.notEqual(result.user, target.user);
  assert.notEqual(result.user.roles, target.user.roles);
});

test('exports the compatible default, named function, and all helper', () => {
  assert.equal(merge, deepmerge);
  assert.equal(merge.all, all);
  assert.equal(merge.deepmerge, merge);
  assert.equal(merge.isMergeableObject, isMergeableObject);
  assert.equal(merge.isPlainMergeableObject, isPlainMergeableObject);
  assert.equal(merge.createDeepmerge, createDeepmerge);
  assert.equal(merge.strict, strict);
  assert.equal(merge.strictOptions, strictOptions);
  assert.equal(merge.overwriteArrays, overwriteArrays);
  assert.equal(merge.mergeArraysByIndex, mergeArraysByIndex);
  assert.equal(merge.mergeArraysByKey, mergeArraysByKey);
  assert.equal(merge.concatUniqueArrays, concatUniqueArrays);
  assert.equal(merge.UnsafeKeyError, UnsafeKeyError);
  assert.equal(merge.DeepMergeLimitError, DeepMergeLimitError);
  assert.deepEqual(all([{ one: 1 }, { two: 2 }, { three: 3 }]), {
    one: 1,
    two: 2,
    three: 3
  });
  assert.deepEqual(all([]), {});
  assert.throws(() => all({}), /first argument should be an array/);
});

test('supports overwrite and custom array merge functions', () => {
  const overwrite = (_target, source) => source;
  assert.deepEqual(merge([1, 2], [3], { arrayMerge: overwrite }), [3]);

  const combine = (target, source, options) => {
    const destination = target.slice();
    for (const [index, value] of source.entries()) {
      if (destination[index] === undefined) {
        destination[index] = options.cloneUnlessOtherwiseSpecified(value, options);
      } else if (options.isMergeableObject(value)) {
        destination[index] = merge(destination[index], value, options);
      } else if (!target.includes(value)) {
        destination.push(value);
      }
    }
    return destination;
  };

  assert.deepEqual(
    merge([{ a: true }], [{ b: true }, 'new'], { arrayMerge: combine }),
    [{ a: true, b: true }, 'new']
  );
});

test('supports custom merge functions by property', () => {
  const result = merge(
    { name: { first: 'Ada', last: 'Lovelace' }, tags: ['math'] },
    { name: { first: 'Grace', last: 'Hopper' }, tags: ['code'] },
    {
      customMerge(key, options) {
        assert.equal(typeof options.cloneUnlessOtherwiseSpecified, 'function');
        if (key === 'name') {
          return (left, right) => `${left.first} + ${right.first}`;
        }
        return undefined;
      }
    }
  );

  assert.deepEqual(result, {
    name: 'Ada + Grace',
    tags: ['math', 'code']
  });

  const delegated = merge(
    { list: [{ left: true }] },
    { list: [{ right: true }] },
    {
      customMerge(key, options) {
        if (key !== 'list') return undefined;
        return (target, source, callbackOptions) =>
          options.arrayMerge(target, source, callbackOptions);
      }
    }
  );
  assert.deepEqual(delegated, {
    list: [{ left: true }, { right: true }]
  });
});

test('allows array hooks to clone with explicitly nested options', () => {
  const shared = { value: true };
  const result = merge([], [shared], {
    arrayMerge(_target, source, options) {
      return source.map((value) =>
        options.cloneUnlessOtherwiseSpecified(value, { clone: false })
      );
    }
  });

  assert.equal(result[0], shared);
});

test('supports custom mergeable-object predicates', () => {
  class Token {
    constructor(value) {
      this.value = value;
    }
  }

  const token = new Token('source');
  const result = merge(
    { config: { inherited: true } },
    { config: token },
    {
      isMergeableObject(value) {
        if (!value || objectTag(value) !== '[object Object]') return false;
        const prototype = Object.getPrototypeOf(value);
        return prototype === null || prototype === Object.prototype;
      }
    }
  );

  assert.equal(result.config, token);
  assert.equal(result.config instanceof Token, true);
});

test('clone false preserves nested references', () => {
  const nested = { value: 1 };
  const result = merge({}, { nested }, { clone: false });
  assert.equal(result.nested, nested);
});

test('dates, regular expressions, and React elements are atomic', () => {
  const date = new Date('2026-01-01T00:00:00Z');
  const expression = /stackline/gi;
  const react = {
    $$typeof: Symbol.for('react.element'),
    props: { label: 'safe' },
    type: 'span'
  };

  const result = merge({}, { date, expression, react });
  assert.equal(result.date, date);
  assert.equal(result.expression, expression);
  assert.equal(result.react, react);
  assert.equal(isMergeableObject(date), false);
  assert.equal(isMergeableObject(expression), false);
  assert.equal(isMergeableObject(react), false);
  assert.equal(isMergeableObject({}), true);
  assert.equal(isMergeableObject([]), true);
  assert.equal(isMergeableObject(null), false);
});

test('copies enumerable symbols and ignores non-enumerable symbols', () => {
  const visible = Symbol('visible');
  const hidden = Symbol('hidden');
  const source = { normal: true };
  source[visible] = { value: 1 };
  Object.defineProperty(source, hidden, { enumerable: false, value: 2 });

  const result = merge({}, source);
  assert.deepEqual(result[visible], { value: 1 });
  assert.equal(result[hidden], undefined);
  assert.notEqual(result[visible], source[visible]);
});

test('preserves sparse array slots', () => {
  const left = [];
  left.length = 2;
  left[1] = 'left';
  const right = [];
  right.length = 2;
  right[0] = 'right';

  const result = merge(left, right);
  assert.equal(result.length, 4);
  assert.equal(0 in result, false);
  assert.equal(result[1], 'left');
  assert.equal(result[2], 'right');
  assert.equal(3 in result, false);
});

test('handles array and object type mismatches like deepmerge v4', () => {
  assert.deepEqual(merge({ value: true }, [1, { deep: true }]), [1, { deep: true }]);
  assert.deepEqual(merge([1, 2], { value: true }), { value: true });
});

test('validates Stackline options and keeps deepmerge hooks as lenient as v4', () => {
  assert.throws(() => merge({}, {}, 'invalid'), /options must be an object/);
  assert.throws(() => merge({}, {}, { maxDepth: -1 }), /maxDepth must be/);
  assert.throws(() => merge({}, {}, { maxKeys: 1.2 }), /maxKeys must be/);
  assert.throws(() => merge({}, {}, { onUnsafeKey: 'allow' }), /onUnsafeKey must be/);
  assert.throws(() => merge({}, {}, { onUnsafeKey: '' }), /onUnsafeKey must be/);
  assert.throws(() => merge({}, {}, { unsafeKeys: 'none' }), /unsafeKeys must be/);
  assert.throws(
    () => merge({}, {}, { customMergeScope: 'leaves' }),
    /customMergeScope must be/
  );
  assert.deepEqual(
    merge({ a: 1 }, { b: 2 }, { maxDepth: null, maxKeys: undefined, onUnsafeKey: null }),
    { a: 1, b: 2 }
  );

  assert.deepEqual(merge({ a: [1] }, { a: [2] }, { arrayMerge: false }), { a: [1, 2] });
  assert.deepEqual(merge({ a: 1 }, { b: 2 }, { arrayMerge: true }), { a: 1, b: 2 });
  assert.throws(() => merge({ a: [1] }, { a: [2] }, { arrayMerge: true }), TypeError);
  assert.throws(() => merge({}, {}, { isMergeableObject: true }), TypeError);
  assert.throws(
    () => merge({ a: { left: 1 } }, { a: { right: 1 } }, { customMerge: true }),
    TypeError
  );
});

test('reads inherited, non-enumerable, accessor, and frozen options without mutating them', () => {
  const overwrite = (_target, source) => source;
  const inherited = Object.create({ arrayMerge: overwrite });
  assert.deepEqual(merge({ a: [1] }, { a: [2] }, inherited), { a: [2] });

  const hidden = {};
  Object.defineProperty(hidden, 'arrayMerge', { enumerable: false, value: overwrite });
  assert.deepEqual(merge({ a: [1] }, { a: [2] }, hidden), { a: [2] });

  let reads = 0;
  const accessor = {
    get clone() {
      reads += 1;
      return false;
    }
  };
  const nested = { value: true };
  assert.equal(merge({}, { nested }, accessor).nested, nested);
  assert.ok(reads > 0);

  const frozen = Object.freeze({ clone: true, arrayMerge: null });
  assert.deepEqual(merge({ a: [1] }, { a: [2] }, frozen), { a: [1, 2] });
  assert.deepEqual(Object.keys(frozen), ['clone', 'arrayMerge']);

  const plain = { clone: true };
  merge({}, {}, plain);
  assert.deepEqual(Object.keys(plain), ['clone']);

  const functionOptions = Object.assign(() => undefined, { arrayMerge: overwrite });
  assert.deepEqual(merge({ a: [1] }, { a: [2] }, functionOptions), { a: [2] });
});

function objectTag(value) {
  return Object.prototype.toString.call(value);
}
