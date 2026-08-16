import assert from 'node:assert/strict';
import test from 'node:test';

import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  all,
  deepmerge,
  isMergeableObject
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

test('rejects invalid option shapes', () => {
  assert.throws(() => merge({}, {}, null), /options must be an object/);
  assert.throws(() => merge({}, {}, { arrayMerge: true }), /arrayMerge must be/);
  assert.throws(() => merge({}, {}, { arrayMerge: false }), /arrayMerge must be/);
  assert.throws(
    () => merge({}, {}, { isMergeableObject: true }),
    /isMergeableObject must be/
  );
  assert.throws(
    () => merge({}, {}, { isMergeableObject: 0 }),
    /isMergeableObject must be/
  );
  assert.throws(() => merge({}, {}, { customMerge: true }), /customMerge must be/);
  assert.throws(() => merge({}, {}, { maxDepth: -1 }), /maxDepth must be/);
  assert.throws(() => merge({}, {}, { maxKeys: 1.2 }), /maxKeys must be/);
  assert.throws(() => merge({}, {}, { onUnsafeKey: 'allow' }), /onUnsafeKey must be/);
  assert.throws(() => merge({}, {}, { onUnsafeKey: '' }), /onUnsafeKey must be/);
});

function objectTag(value) {
  return Object.prototype.toString.call(value);
}
