const objectToString = Object.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;
const propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const reactElementType =
  typeof Symbol === 'function' && typeof Symbol.for === 'function'
    ? Symbol.for('react.element')
    : 0xeac7;

export class UnsafeKeyError extends TypeError {
  constructor(key, path) {
    const location = formatPath(path.concat(key));
    super(`Refusing to merge unsafe key ${String(key)} at ${location}`);
    this.name = 'UnsafeKeyError';
    this.code = 'ERR_DEEPMERGE_UNSAFE_KEY';
    this.key = key;
    this.path = location;
  }
}

export class DeepMergeLimitError extends RangeError {
  constructor(kind, limit, path) {
    const location = formatPath(path);
    super(`Deep merge ${kind} limit of ${limit} exceeded at ${location}`);
    this.name = 'DeepMergeLimitError';
    this.code = 'ERR_DEEPMERGE_LIMIT';
    this.kind = kind;
    this.limit = limit;
    this.path = location;
  }
}

export function isMergeableObject(value) {
  if (!value || typeof value !== 'object') return false;

  const tag = objectToString.call(value);
  if (tag === '[object Date]' || tag === '[object RegExp]') return false;
  return value.$$typeof !== reactElementType;
}

function formatPath(path) {
  if (path.length === 0) return '<root>';
  let output = '<root>';
  for (const part of path) {
    if (typeof part === 'number') {
      output += `[${part}]`;
    } else if (typeof part === 'symbol') {
      output += `[${String(part)}]`;
    } else if (/^[A-Za-z_$][\w$]*$/.test(part)) {
      output += `.${part}`;
    } else {
      output += `[${JSON.stringify(part)}]`;
    }
  }
  return output;
}

function defaultArrayMerge(target, source, options) {
  return target
    .concat(source)
    .map((value) => options.cloneUnlessOtherwiseSpecified(value, options));
}

function normalizeLimit(value, fallback, name) {
  const resolved = value === undefined ? fallback : value;
  if (resolved === Infinity) return resolved;
  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer or Infinity`);
  }
  return resolved;
}

function createState(inputOptions) {
  if (
    inputOptions !== undefined &&
    (inputOptions === null || typeof inputOptions !== 'object')
  ) {
    throw new TypeError('options must be an object when provided');
  }

  const input = inputOptions || {};
  const onUnsafeKey =
    input.onUnsafeKey === undefined ? 'skip' : input.onUnsafeKey;
  if (onUnsafeKey !== 'skip' && onUnsafeKey !== 'throw') {
    throw new TypeError("onUnsafeKey must be either 'skip' or 'throw'");
  }

  const state = {
    cloneMemo: new WeakMap(),
    pairMemo: new WeakMap(),
    keyCount: 0,
    callbackDepth: 0,
    options: null
  };

  const options = {
    ...input,
    arrayMerge:
      input.arrayMerge === undefined ? defaultArrayMerge : input.arrayMerge,
    isMergeableObject:
      input.isMergeableObject === undefined
        ? isMergeableObject
        : input.isMergeableObject,
    maxDepth: normalizeLimit(input.maxDepth, 1000, 'maxDepth'),
    maxKeys: normalizeLimit(input.maxKeys, 100000, 'maxKeys'),
    onUnsafeKey
  };

  if (typeof options.arrayMerge !== 'function') {
    throw new TypeError('arrayMerge must be a function');
  }
  if (typeof options.isMergeableObject !== 'function') {
    throw new TypeError('isMergeableObject must be a function');
  }
  if (options.customMerge !== undefined && typeof options.customMerge !== 'function') {
    throw new TypeError('customMerge must be a function');
  }

  options.cloneUnlessOtherwiseSpecified = (value, callbackOptions) => {
    if (callbackOptions && callbackOptions !== options) {
      const nestedState = createState(callbackOptions);
      return cloneValue(value, nestedState, 0, []);
    }
    return cloneValue(value, state, state.callbackDepth + 1, []);
  };
  state.options = options;
  return state;
}

function isWeakKey(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

function getPair(state, target, source) {
  if (!isWeakKey(target) || !isWeakKey(source)) return undefined;
  const bySource = state.pairMemo.get(target);
  return bySource && bySource.get(source);
}

function rememberPair(state, target, source, destination) {
  if (!isWeakKey(target) || !isWeakKey(source)) return;
  let bySource = state.pairMemo.get(target);
  if (!bySource) {
    bySource = new WeakMap();
    state.pairMemo.set(target, bySource);
  }
  bySource.set(source, destination);
}

function rememberClone(state, value, destination) {
  if (isWeakKey(value)) state.cloneMemo.set(value, destination);
}

function enforceDepth(state, depth, path) {
  if (depth > state.options.maxDepth) {
    throw new DeepMergeLimitError('depth', state.options.maxDepth, path);
  }
}

function consumeKeys(state, count, path) {
  state.keyCount += count;
  if (state.keyCount > state.options.maxKeys) {
    throw new DeepMergeLimitError('key', state.options.maxKeys, path);
  }
}

function getEnumerableKeys(value) {
  const keys = Object.keys(value);
  if (typeof Object.getOwnPropertySymbols !== 'function') return keys;
  return keys.concat(
    Object.getOwnPropertySymbols(Object(value)).filter((symbol) =>
      propertyIsEnumerable.call(value, symbol)
    )
  );
}

function isUnsafeKey(key) {
  return typeof key === 'string' && unsafeKeys.has(key);
}

function shouldSkipKey(key, state, path) {
  if (!isUnsafeKey(key)) return false;
  if (state.options.onUnsafeKey === 'throw') {
    throw new UnsafeKeyError(key, path);
  }
  return true;
}

function propertyIsOnObject(object, property) {
  try {
    return property in object;
  } catch {
    return false;
  }
}

function propertyIsUnsafe(target, key) {
  return (
    propertyIsOnObject(target, key) &&
    !(hasOwn.call(target, key) && propertyIsEnumerable.call(target, key))
  );
}

function defineValue(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

function cloneValue(value, state, depth, path) {
  if (state.options.clone === false || !state.options.isMergeableObject(value)) {
    return value;
  }

  const remembered = state.cloneMemo.get(value);
  if (remembered !== undefined) return remembered;
  return mergeInternal(Array.isArray(value) ? [] : {}, value, state, depth, path);
}

function mergeArrays(target, source, state, depth, path) {
  if (state.options.arrayMerge !== defaultArrayMerge) {
    const previousDepth = state.callbackDepth;
    state.callbackDepth = depth;
    try {
      return state.options.arrayMerge(target, source, state.options);
    } finally {
      state.callbackDepth = previousDepth;
    }
  }

  const remembered = getPair(state, target, source);
  if (remembered !== undefined) return remembered;

  const destination = [];
  rememberPair(state, target, source, destination);
  rememberClone(state, target, destination);
  rememberClone(state, source, destination);

  const combined = target.concat(source);
  destination.length = combined.length;
  for (let index = 0; index < combined.length; index += 1) {
    if (!(index in combined)) continue;
    destination[index] = cloneValue(
      combined[index],
      state,
      depth + 1,
      path.concat(index)
    );
  }
  return destination;
}

function getCustomMerge(key, state) {
  if (!state.options.customMerge) return undefined;
  const candidate = state.options.customMerge(key, state.options);
  return typeof candidate === 'function' ? candidate : undefined;
}

function mergeObjects(target, source, state, depth, path) {
  const remembered = getPair(state, target, source);
  if (remembered !== undefined) return remembered;

  const destination = {};
  rememberPair(state, target, source, destination);
  rememberClone(state, target, destination);
  rememberClone(state, source, destination);

  const targetKeys = state.options.isMergeableObject(target)
    ? getEnumerableKeys(target)
    : [];
  const sourceKeys = getEnumerableKeys(source);
  consumeKeys(state, targetKeys.length + sourceKeys.length, path);

  const acceptedSourceKeys = [];
  const acceptedSourceSet = new Set();
  for (const key of sourceKeys) {
    if (shouldSkipKey(key, state, path) || propertyIsUnsafe(target, key)) continue;
    acceptedSourceKeys.push(key);
    acceptedSourceSet.add(key);
  }

  for (const key of targetKeys) {
    if (shouldSkipKey(key, state, path) || acceptedSourceSet.has(key)) continue;
    defineValue(
      destination,
      key,
      cloneValue(target[key], state, depth + 1, path.concat(key))
    );
  }

  for (const key of acceptedSourceKeys) {
    const sourceValue = source[key];
    let value;

    if (propertyIsOnObject(target, key) && state.options.isMergeableObject(sourceValue)) {
      const customMerge = getCustomMerge(key, state);
      if (customMerge) {
        const previousDepth = state.callbackDepth;
        state.callbackDepth = depth;
        try {
          value = customMerge(target[key], sourceValue, state.options);
        } finally {
          state.callbackDepth = previousDepth;
        }
      } else {
        value = mergeInternal(
          target[key],
          sourceValue,
          state,
          depth + 1,
          path.concat(key)
        );
      }
    } else {
      value = cloneValue(sourceValue, state, depth + 1, path.concat(key));
    }
    defineValue(destination, key, value);
  }

  return destination;
}

function mergeInternal(target, source, state, depth, path) {
  enforceDepth(state, depth, path);

  const sourceIsArray = Array.isArray(source);
  const targetIsArray = Array.isArray(target);
  if (sourceIsArray !== targetIsArray) {
    return cloneValue(source, state, depth + 1, path);
  }
  if (sourceIsArray) return mergeArrays(target, source, state, depth, path);
  return mergeObjects(target, source, state, depth, path);
}

export function deepmerge(target, source, options) {
  return mergeInternal(target, source, createState(options), 0, []);
}

export function all(objects, options) {
  if (!Array.isArray(objects)) {
    throw new Error('first argument should be an array');
  }
  return objects.reduce((result, value) => deepmerge(result, value, options), {});
}

deepmerge.all = all;
deepmerge.isMergeableObject = isMergeableObject;
deepmerge.UnsafeKeyError = UnsafeKeyError;
deepmerge.DeepMergeLimitError = DeepMergeLimitError;
deepmerge.deepmerge = deepmerge;

export default deepmerge;
