import assert from 'node:assert/strict';

const getPrototypeOf = Object.getPrototypeOf;

function isReference(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

export function collectReferences(...roots) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!isReference(value) || seen.has(value)) continue;
    seen.add(value);
    if (value instanceof Map) {
      for (const [key, entry] of value) stack.push(key, entry);
    } else if (value instanceof Set) {
      for (const entry of value) stack.push(entry);
    }
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if ('value' in descriptor) stack.push(descriptor.value);
    }
  }
  return seen;
}

export function fingerprint(root) {
  const ids = new Map();
  const output = [];
  const stack = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (!isReference(value)) {
      output.push(describePrimitive(value));
      continue;
    }
    if (ids.has(value)) {
      output.push(`#${ids.get(value)}`);
      continue;
    }
    ids.set(value, ids.size);
    output.push(`@${ids.get(value)}:${Object.prototype.toString.call(value)}`);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      output.push(
        `${describePrimitive(key)}/${descriptor.enumerable}/${descriptor.writable}/${'get' in descriptor}`
      );
      if ('value' in descriptor) stack.push(descriptor.value);
    }
  }
  return output.join('|');
}

function describePrimitive(value) {
  if (typeof value === 'symbol') return `sym:${String(value)}`;
  if (typeof value === 'bigint') return `big:${value}`;
  if (Object.is(value, -0)) return 'num:-0';
  return `${typeof value}:${String(value)}`;
}

/**
 * Asserts that two merge results have the same shape, own-key order,
 * property descriptors, prototypes, and internal aliasing. References to
 * caller-owned input objects must be identical in both results.
 */
export function assertSameGraph(actual, expected, inputs, label) {
  const forward = new Map();
  const backward = new Map();
  const stack = [[actual, expected, '<root>']];

  while (stack.length > 0) {
    const [left, right, path] = stack.pop();
    if (!isReference(left) || !isReference(right)) {
      assert.ok(Object.is(left, right), `${label}: value differs at ${path}`);
      continue;
    }
    if (inputs.has(left) || inputs.has(right)) {
      assert.equal(left, right, `${label}: input reference differs at ${path}`);
      continue;
    }
    if (forward.has(left) || backward.has(right)) {
      assert.equal(forward.get(left), right, `${label}: aliasing differs at ${path}`);
      continue;
    }
    forward.set(left, right);
    backward.set(right, left);

    assert.equal(getPrototypeOf(left), getPrototypeOf(right), `${label}: prototype differs at ${path}`);
    assert.equal(Array.isArray(left), Array.isArray(right), `${label}: kind differs at ${path}`);

    const leftKeys = Reflect.ownKeys(left);
    const rightKeys = Reflect.ownKeys(right);
    assert.deepEqual(
      leftKeys.map(String),
      rightKeys.map(String),
      `${label}: own-key order differs at ${path}`
    );
    for (let index = 0; index < leftKeys.length; index += 1) {
      assert.equal(leftKeys[index], rightKeys[index], `${label}: key differs at ${path}`);
      const key = leftKeys[index];
      const leftDescriptor = Object.getOwnPropertyDescriptor(left, key);
      const rightDescriptor = Object.getOwnPropertyDescriptor(right, key);
      for (const flag of ['configurable', 'enumerable', 'writable']) {
        assert.equal(
          leftDescriptor[flag],
          rightDescriptor[flag],
          `${label}: ${flag} differs at ${path}.${String(key)}`
        );
      }
      stack.push([leftDescriptor.value, rightDescriptor.value, `${path}.${String(key)}`]);
    }
  }
}

export function outcome(run) {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    return { ok: false, error };
  }
}

export function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
