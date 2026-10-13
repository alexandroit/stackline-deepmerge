const objectToString = Object.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;
const propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const getPrototypeOf = Object.getPrototypeOf;
const canUseSymbol = typeof Symbol === 'function' && typeof Symbol.for === 'function';
const reactElementType = canUseSymbol ? Symbol.for('react.element') : 0xeac7;
const reactTransitionalElementType = canUseSymbol
  ? Symbol.for('react.transitional.element')
  : 0xeac7;
const getMapSize = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get;
const getSetSize = Object.getOwnPropertyDescriptor(Set.prototype, 'size').get;

const NOT_COLLECTION = 0;
const MAP = 1;
const SET = 2;
const CLONE = {};
const emptyObject = {};
const emptyMap = new Map();
const emptySet = new Set();
const noKeys = [];
const optionStates = new WeakMap();
const optionNames = [
  'arrayMerge',
  'clone',
  'customMerge',
  'customMergeScope',
  'isMergeableObject',
  'maxDepth',
  'maxKeys',
  'mergeCollections',
  'onUnsafeKey',
  'skipUndefined',
  'unsafeKeys'
];

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
  return !isReactElement(value);
}

export function isPlainMergeableObject(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;

  const prototype = getPrototypeOf(value);
  if (prototype !== null && getPrototypeOf(prototype) !== null) return false;
  return !isReactElement(value);
}

function isReactElement(value) {
  const type = value.$$typeof;
  return type === reactElementType || type === reactTransitionalElementType;
}

function formatPath(path) {
  let output = '<root>';
  for (const part of path) output += formatPathPart(part);
  return output;
}

function formatPathPart(part) {
  if (typeof part === 'number') return `[${part}]`;
  if (typeof part === 'symbol') return `[${String(part)}]`;
  if (typeof part === 'string') {
    return /^[A-Za-z_$][\w$]*$/.test(part) ? `.${part}` : `[${JSON.stringify(part)}]`;
  }
  if (part !== null && (typeof part === 'object' || typeof part === 'function')) {
    return '[object]';
  }
  return `[${String(part)}]`;
}

function defaultArrayMerge(target, source, options) {
  return target
    .concat(source)
    .map((value) => options.cloneUnlessOtherwiseSpecified(value, options));
}

function isNil(value) {
  return value === undefined || value === null;
}

function normalizeLimit(value, name) {
  if (isNil(value) || value === Infinity) return Infinity;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer or Infinity`);
  }
  return value;
}

function normalizeChoice(value, fallback, choices, name) {
  const resolved = isNil(value) ? fallback : value;
  if (choices.indexOf(resolved) === -1) {
    throw new TypeError(`${name} must be either '${choices.join("' or '")}'`);
  }
  return resolved;
}

function toOptionsObject(input) {
  if (typeof input === 'object' || typeof input === 'function') return input;
  throw new TypeError('options must be an object when provided');
}

function copyProperty(output, input, key) {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  descriptor.configurable = true;
  if ('value' in descriptor) descriptor.writable = true;
  Object.defineProperty(output, key, descriptor);
}

function copyOptions(input) {
  const output = Object.create(getPrototypeOf(input));
  for (const key of Reflect.ownKeys(input)) copyProperty(output, input, key);
  return output;
}

function defineValue(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

function setValue(target, key, value) {
  if (key in objectPrototype) {
    defineValue(target, key, value);
  } else {
    target[key] = value;
  }
}

function createState(input) {
  const options = input ? copyOptions(toOptionsObject(input)) : {};
  const onUnsafeKey = normalizeChoice(
    options.onUnsafeKey,
    'skip',
    ['skip', 'throw'],
    'onUnsafeKey'
  );
  const unsafeKeys = normalizeChoice(
    options.unsafeKeys,
    isNil(options.onUnsafeKey) ? 'compatible' : 'strict',
    ['compatible', 'strict'],
    'unsafeKeys'
  );
  const customMergeScope = normalizeChoice(
    options.customMergeScope,
    'objects',
    ['objects', 'all'],
    'customMergeScope'
  );

  const state = {
    active: new Map(),
    clone: options.clone !== false,
    collections: Boolean(options.mergeCollections),
    customMergeAll: customMergeScope === 'all',
    depth: 0,
    keyCount: 0,
    maxDepth: normalizeLimit(options.maxDepth, 'maxDepth'),
    maxKeys: normalizeLimit(options.maxKeys, 'maxKeys'),
    options,
    path: [],
    skipUndefined: Boolean(options.skipUndefined),
    strictKeys: unsafeKeys === 'strict',
    throwOnUnsafeKey: onUnsafeKey === 'throw'
  };

  defineValue(options, 'arrayMerge', options.arrayMerge || defaultArrayMerge);
  defineValue(
    options,
    'isMergeableObject',
    options.isMergeableObject || isMergeableObject
  );
  defineValue(options, 'cloneUnlessOtherwiseSpecified', (value, callbackOptions) =>
    cloneFromCallback(
      value,
      callbackOptions && callbackOptions !== options ? stateFor(callbackOptions) : state
    )
  );
  optionStates.set(options, state);
  return state;
}

function stateFor(options) {
  const existing = optionStates.get(options);
  return existing === undefined ? createState(options) : existing;
}

function cloneFromCallback(value, state) {
  const depth = state.depth;
  const length = state.path.length;
  state.depth = depth + 1;
  try {
    return cloneValue(value, state);
  } finally {
    state.depth = depth;
    state.path.length = length;
  }
}

function findActive(state, source, other) {
  for (let entry = state.active.get(source); entry !== undefined; entry = entry.previous) {
    if (entry.other === other) return entry.destination;
  }
  return undefined;
}

function pushActive(state, source, other, destination) {
  state.active.set(source, { destination, other, previous: state.active.get(source) });
}

function popActive(state, source) {
  const previous = state.active.get(source).previous;
  if (previous === undefined) {
    state.active.delete(source);
  } else {
    state.active.set(source, previous);
  }
}

function checkDepth(state) {
  if (state.depth > state.maxDepth) {
    throw new DeepMergeLimitError('depth', state.maxDepth, state.path);
  }
}

function consumeKeys(state, count) {
  state.keyCount += count;
  if (state.keyCount > state.maxKeys) {
    throw new DeepMergeLimitError('key', state.maxKeys, state.path);
  }
}

function getEnumerableKeys(value) {
  const keys = Object.keys(value);
  if (typeof Object.getOwnPropertySymbols !== 'function') return keys;
  const symbols = Object.getOwnPropertySymbols(Object(value));
  if (symbols.length === 0) return keys;
  for (const symbol of symbols) {
    if (propertyIsEnumerable.call(value, symbol)) keys.push(symbol);
  }
  return keys;
}

function isBlockedKey(key, state) {
  return (
    key === '__proto__' ||
    (state.strictKeys && (key === 'constructor' || key === 'prototype'))
  );
}

function rejectKey(key, state) {
  if (state.throwOnUnsafeKey) throw new UnsafeKeyError(key, state.path);
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

function isEmptyPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    getPrototypeOf(value) === objectPrototype &&
    Reflect.ownKeys(value).length === 0
  );
}

function collectionKind(value) {
  if (!value || typeof value !== 'object') return NOT_COLLECTION;
  const tag = objectToString.call(value);
  if (tag === '[object Map]') return hasBrand(getMapSize, value) ? MAP : NOT_COLLECTION;
  if (tag === '[object Set]') return hasBrand(getSetSize, value) ? SET : NOT_COLLECTION;
  return NOT_COLLECTION;
}

function hasBrand(getSize, value) {
  try {
    getSize.call(value);
    return true;
  } catch {
    return false;
  }
}

function isMergeableValue(value, state) {
  return (
    (state.collections && collectionKind(value) !== NOT_COLLECTION) ||
    state.options.isMergeableObject(value)
  );
}

function cloneValue(value, state) {
  if (!state.clone) return value;
  if (state.collections) {
    const kind = collectionKind(value);
    if (kind !== NOT_COLLECTION) {
      return mergeCollections(kind === MAP ? emptyMap : emptySet, value, kind, state, true);
    }
  }
  if (!state.options.isMergeableObject(value)) return value;
  return Array.isArray(value)
    ? mergeArrays(noKeys, value, state, true)
    : mergeObjects(emptyObject, value, state, true);
}

function cloneChild(value, key, state) {
  state.path.push(key);
  state.depth += 1;
  const result = cloneValue(value, state);
  state.depth -= 1;
  state.path.pop();
  return result;
}

function mergeChild(targetValue, sourceValue, key, state, mergeable) {
  state.path.push(key);
  state.depth += 1;
  const result = mergeable
    ? mergeInternal(targetValue, sourceValue, state)
    : cloneValue(sourceValue, state);
  state.depth -= 1;
  state.path.pop();
  return result;
}

function mergeInternal(target, source, state) {
  if (state.collections) {
    const kind = collectionKind(source);
    if (kind !== NOT_COLLECTION) {
      return collectionKind(target) === kind
        ? mergeCollections(target, source, kind, state, false)
        : mergeCollections(kind === MAP ? emptyMap : emptySet, source, kind, state, true);
    }
  }

  const sourceIsArray = Array.isArray(source);
  if (sourceIsArray !== Array.isArray(target)) return cloneValue(source, state);
  return sourceIsArray
    ? mergeArrays(target, source, state, false)
    : mergeObjects(target, source, state, false);
}

function mergeArrays(target, source, state, cloning) {
  checkDepth(state);
  const options = state.options;
  if (options.arrayMerge !== defaultArrayMerge) {
    const depth = state.depth;
    const length = state.path.length;
    try {
      return options.arrayMerge(cloning ? [] : target, source, options);
    } finally {
      state.depth = depth;
      state.path.length = length;
    }
  }

  const other = cloning ? CLONE : target;
  const active = findActive(state, source, other);
  if (active !== undefined) return active;

  const combined = cloning ? source : target.concat(source);
  const destination = new Array(combined.length);
  const alias =
    !cloning && target.length === 0 && getPrototypeOf(target) === arrayPrototype;
  pushActive(state, source, other, destination);
  if (alias) pushActive(state, source, CLONE, destination);
  try {
    for (let index = 0; index < combined.length; index += 1) {
      if (index in combined) destination[index] = cloneChild(combined[index], index, state);
    }
  } finally {
    if (alias) popActive(state, source);
    popActive(state, source);
  }
  return destination;
}

function takesSourceValue(key, source, state) {
  return (
    propertyIsEnumerable.call(source, key) &&
    !(state.skipUndefined && source[key] === undefined)
  );
}

function mergeObjects(target, source, state, cloning) {
  checkDepth(state);
  const other = cloning ? CLONE : target;
  const active = findActive(state, source, other);
  if (active !== undefined) return active;

  const options = state.options;
  const targetKeys =
    !cloning && options.isMergeableObject(target) ? getEnumerableKeys(target) : noKeys;
  const sourceKeys = getEnumerableKeys(source);
  if (state.maxKeys !== Infinity) {
    consumeKeys(state, targetKeys.length + sourceKeys.length);
  }

  const destination = {};
  const alias = !cloning && targetKeys.length === 0 && isEmptyPlainObject(target);
  pushActive(state, source, other, destination);
  if (alias) pushActive(state, source, CLONE, destination);
  try {
    for (const key of targetKeys) {
      if (isBlockedKey(key, state)) {
        rejectKey(key, state);
      } else if (takesSourceValue(key, source, state)) {
        setValue(destination, key, undefined);
      } else {
        setValue(destination, key, cloneChild(target[key], key, state));
      }
    }

    for (const key of sourceKeys) {
      if (isBlockedKey(key, state)) {
        rejectKey(key, state);
        continue;
      }
      if (propertyIsUnsafe(target, key)) continue;

      const sourceValue = source[key];
      if (!propertyIsOnObject(target, key)) {
        setValue(destination, key, cloneChild(sourceValue, key, state));
      } else if (!(sourceValue === undefined && state.skipUndefined)) {
        setValue(destination, key, mergeProperty(target, sourceValue, key, state));
      }
    }
  } finally {
    if (alias) popActive(state, source);
    popActive(state, source);
  }
  return destination;
}

function mergeProperty(target, sourceValue, key, state) {
  const options = state.options;
  const mergeable = isMergeableValue(sourceValue, state);
  if (!mergeable && !state.customMergeAll) return cloneChild(sourceValue, key, state);

  const targetValue = target[key];
  if (options.customMerge) {
    state.path.push(key);
    const merger = options.customMerge(key, options, {
      path: state.path.slice(),
      source: sourceValue,
      target: targetValue
    });
    state.path.pop();
    if (typeof merger === 'function') {
      return callMerger(merger, targetValue, sourceValue, key, state);
    }
  }
  return mergeChild(targetValue, sourceValue, key, state, mergeable);
}

function callMerger(merger, targetValue, sourceValue, key, state) {
  const depth = state.depth;
  const length = state.path.length;
  state.path.push(key);
  state.depth = depth + 1;
  try {
    return merger(targetValue, sourceValue, state.options);
  } finally {
    state.depth = depth;
    state.path.length = length;
  }
}

function mergeCollections(target, source, kind, state, cloning) {
  checkDepth(state);
  const other = cloning ? CLONE : target;
  const active = findActive(state, source, other);
  if (active !== undefined) return active;
  if (state.maxKeys !== Infinity) consumeKeys(state, target.size + source.size);

  const destination = kind === MAP ? new Map() : new Set();
  const alias = !cloning && target.size === 0;
  pushActive(state, source, other, destination);
  if (alias) pushActive(state, source, CLONE, destination);
  try {
    if (kind === MAP) {
      fillMap(destination, target, source, state);
    } else {
      fillSet(destination, target, source, state);
    }
  } finally {
    if (alias) popActive(state, source);
    popActive(state, source);
  }
  return destination;
}

function fillMap(destination, target, source, state) {
  for (const [key, value] of target) {
    if (source.has(key) && !(state.skipUndefined && source.get(key) === undefined)) {
      destination.set(key, undefined);
    } else {
      destination.set(key, cloneChild(value, key, state));
    }
  }
  for (const [key, value] of source) {
    if (!target.has(key)) {
      destination.set(key, cloneChild(value, key, state));
    } else if (!(value === undefined && state.skipUndefined)) {
      destination.set(
        key,
        mergeChild(target.get(key), value, key, state, isMergeableValue(value, state))
      );
    }
  }
}

function fillSet(destination, target, source, state) {
  const values = new Set(target);
  for (const value of source) values.add(value);
  let index = 0;
  for (const value of values) {
    destination.add(cloneChild(value, index, state));
    index += 1;
  }
}

export function deepmerge(target, source, options) {
  return mergeInternal(target, source, createState(options));
}

export function all(objects, options) {
  if (!Array.isArray(objects)) {
    throw new Error('first argument should be an array');
  }
  return objects.reduce((result, value) => deepmerge(result, value, options), {});
}

function withDefaults(defaults, options) {
  if (!options) return defaults;
  const input = toOptionsObject(options);
  const combined = copyOptions(defaults);
  for (const key of Reflect.ownKeys(input)) copyProperty(combined, input, key);
  for (const name of optionNames) {
    if (!hasOwn.call(input, name) && input[name] !== undefined) {
      defineValue(combined, name, input[name]);
    }
  }
  return combined;
}

export function createDeepmerge(defaults) {
  const base = defaults ? copyOptions(toOptionsObject(defaults)) : {};
  createState(base);
  const configured = (target, source, options) =>
    deepmerge(target, source, withDefaults(base, options));
  configured.all = (objects, options) => all(objects, withDefaults(base, options));
  return configured;
}

export const strictOptions = Object.freeze({
  maxDepth: 1000,
  maxKeys: 100000,
  onUnsafeKey: 'throw',
  unsafeKeys: 'strict'
});

export const strict = createDeepmerge(strictOptions);

function arrayMergeOptions(options) {
  return options && typeof options.cloneUnlessOtherwiseSpecified === 'function'
    ? options
    : stateFor(options).options;
}

export function overwriteArrays(_target, source, options) {
  const resolved = arrayMergeOptions(options);
  return source.map((value) => resolved.cloneUnlessOtherwiseSpecified(value, resolved));
}

export function concatUniqueArrays(target, source, options) {
  const resolved = arrayMergeOptions(options);
  const seen = new Set();
  const destination = [];
  for (const list of [target, source]) {
    for (let index = 0; index < list.length; index += 1) {
      if (!(index in list) || seen.has(list[index])) continue;
      seen.add(list[index]);
      destination.push(resolved.cloneUnlessOtherwiseSpecified(list[index], resolved));
    }
  }
  return destination;
}

export function mergeArraysByIndex(target, source, options) {
  const state = stateFor(options);
  const length = Math.max(target.length, source.length);
  const destination = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const inSource =
      index in source && !(state.skipUndefined && source[index] === undefined);
    if (inSource && index in target) {
      const value = source[index];
      destination[index] = mergeChild(
        target[index],
        value,
        index,
        state,
        isMergeableValue(value, state)
      );
    } else if (inSource) {
      destination[index] = cloneChild(source[index], index, state);
    } else if (index in target) {
      destination[index] = cloneChild(target[index], index, state);
    }
  }
  return destination;
}

function rememberPosition(positions, id, position) {
  if (id !== undefined && !positions.has(id)) positions.set(id, position);
}

export function mergeArraysByKey(selector) {
  const selectorType = typeof selector;
  if (
    selectorType !== 'function' &&
    selectorType !== 'string' &&
    selectorType !== 'number' &&
    selectorType !== 'symbol'
  ) {
    throw new TypeError('mergeArraysByKey expects a property key or a function');
  }
  const identify =
    selectorType === 'function'
      ? selector
      : (item) => (item !== null && typeof item === 'object' ? item[selector] : undefined);

  return function arrayMergeByKey(target, source, options) {
    const state = stateFor(options);
    const items = [];
    const positions = new Map();
    for (const list of [target, source]) {
      for (let index = 0; index < list.length; index += 1) {
        if (!(index in list)) continue;
        const value = list[index];
        const id = identify(value);
        const position = list === source && id !== undefined ? positions.get(id) : undefined;
        if (position === undefined) {
          rememberPosition(positions, id, items.length);
          items.push({ sources: [], value });
        } else {
          items[position].sources.push(value);
        }
      }
    }
    return items.map((item, index) => {
      if (item.sources.length === 0) return cloneChild(item.value, index, state);
      let result = item.value;
      for (const value of item.sources) {
        result = mergeChild(result, value, index, state, isMergeableValue(value, state));
      }
      return result;
    });
  };
}

deepmerge.all = all;
deepmerge.mergeArraysByKey = mergeArraysByKey;
deepmerge.concatUniqueArrays = concatUniqueArrays;
deepmerge.createDeepmerge = createDeepmerge;
deepmerge.deepmerge = deepmerge;
deepmerge.DeepMergeLimitError = DeepMergeLimitError;
deepmerge.isMergeableObject = isMergeableObject;
deepmerge.isPlainMergeableObject = isPlainMergeableObject;
deepmerge.mergeArraysByIndex = mergeArraysByIndex;
deepmerge.overwriteArrays = overwriteArrays;
deepmerge.strict = strict;
deepmerge.strictOptions = strictOptions;
deepmerge.UnsafeKeyError = UnsafeKeyError;

export default deepmerge;
