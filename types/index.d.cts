declare function deepmerge<T1, T2>(
  target: T1,
  source: T2,
  options?: deepmerge.Options
): deepmerge.Merge<T1, T2>;
declare function deepmerge<T>(
  target: Partial<T>,
  source: Partial<T>,
  options?: deepmerge.Options
): T;

declare namespace deepmerge {
  type Merge<T, U> = T extends readonly (infer TItem)[]
    ? U extends readonly (infer UItem)[]
      ? Array<TItem | UItem>
      : U
    : T extends object
      ? U extends object
        ? Omit<T, keyof U> & {
            [K in keyof U]: K extends keyof T ? Merge<T[K], U[K]> : U[K];
          }
        : U
      : U;

  type UnsafeKeyAction = 'skip' | 'throw';
  type UnsafeKeyPolicy = 'compatible' | 'strict';
  type CustomMergeScope = 'objects' | 'all';

  /** Third argument passed to `customMerge`. */
  interface CustomMergeContext {
    /** Path from the root to the property being merged, including its key. */
    readonly path: readonly PropertyKey[];
    /** The target value at this path. */
    readonly target: any;
    /** The source value at this path. */
    readonly source: any;
  }

  interface Options {
    arrayMerge?(target: any[], source: any[], options: ArrayMergeOptions): any[];
    clone?: boolean;
    customMerge?(
      key: PropertyKey,
      options?: Options,
      context?: CustomMergeContext
    ): ((target: any, source: any, options?: Options) => any) | undefined;
    /**
     * `'objects'` (default) consults `customMerge` only for mergeable source
     * values, like deepmerge 4. `'all'` also consults it for primitives.
     */
    customMergeScope?: CustomMergeScope;
    isMergeableObject?(value: object): boolean;
    /** Maximum nesting depth. Unlimited by default. */
    maxDepth?: number;
    /** Maximum number of keys read during one merge. Unlimited by default. */
    maxKeys?: number;
    /** Merge `Map` entries and union `Set` values instead of copying them as objects. */
    mergeCollections?: boolean;
    /** Skip or throw on rejected keys. Setting it selects the strict key policy. */
    onUnsafeKey?: UnsafeKeyAction;
    /** Source values that are `undefined` do not replace existing target values. */
    skipUndefined?: boolean;
    /**
     * `'compatible'` (default) always drops `__proto__` and otherwise follows
     * deepmerge 4. `'strict'` also drops `constructor` and `prototype`.
     */
    unsafeKeys?: UnsafeKeyPolicy;
  }

  interface ArrayMergeOptions extends Options {
    arrayMerge(target: any[], source: any[], options: ArrayMergeOptions): any[];
    cloneUnlessOtherwiseSpecified<T>(value: T, options?: Options): T;
    isMergeableObject(value: object): boolean;
  }

  /** A merge function with preset options, created by `createDeepmerge`. */
  interface ConfiguredDeepmerge {
    <T1, T2>(target: T1, source: T2, options?: Options): Merge<T1, T2>;
    <T>(target: Partial<T>, source: Partial<T>, options?: Options): T;
    all: typeof all;
  }

  class UnsafeKeyError extends TypeError {
    constructor(key: PropertyKey, path: PropertyKey[]);
    readonly code: 'ERR_DEEPMERGE_UNSAFE_KEY';
    readonly key: PropertyKey;
    readonly path: string;
  }

  class DeepMergeLimitError extends RangeError {
    constructor(kind: 'depth' | 'key', limit: number, path: PropertyKey[]);
    readonly code: 'ERR_DEEPMERGE_LIMIT';
    readonly kind: 'depth' | 'key';
    readonly limit: number;
    readonly path: string;
  }

  function all<T1, T2>(objects: readonly [T1, T2], options?: Options): Merge<T1, T2>;
  function all<T1, T2, T3>(
    objects: readonly [T1, T2, T3],
    options?: Options
  ): Merge<Merge<T1, T2>, T3>;
  function all<T1, T2, T3, T4>(
    objects: readonly [T1, T2, T3, T4],
    options?: Options
  ): Merge<Merge<Merge<T1, T2>, T3>, T4>;
  function all<T1, T2, T3, T4, T5>(
    objects: readonly [T1, T2, T3, T4, T5],
    options?: Options
  ): Merge<Merge<Merge<Merge<T1, T2>, T3>, T4>, T5>;
  function all<T>(objects: ReadonlyArray<Partial<T>>, options?: Options): T;
  function all(objects: readonly object[], options?: Options): object;
  function isMergeableObject(value: unknown): boolean;
  /** True for arrays and plain objects; class instances and built-ins stay intact. */
  function isPlainMergeableObject(value: unknown): boolean;
  /** Creates a merge function whose options default to `defaults`. */
  function createDeepmerge(defaults?: Options): ConfiguredDeepmerge;
  /** Merge with key, depth, and size hardening that throws on unsafe keys. */
  const strict: ConfiguredDeepmerge;
  const strictOptions: Readonly<{
    maxDepth: 1000;
    maxKeys: 100000;
    onUnsafeKey: 'throw';
    unsafeKeys: 'strict';
  }>;
  /** `arrayMerge` strategy: the source array replaces the target array. */
  function overwriteArrays(target: any[], source: any[], options?: ArrayMergeOptions): any[];
  /** `arrayMerge` strategy: items at the same index are deep merged. */
  function mergeArraysByIndex(target: any[], source: any[], options?: ArrayMergeOptions): any[];
  /** `arrayMerge` strategy: concatenation without repeated values. */
  function concatUniqueArrays(target: any[], source: any[], options?: ArrayMergeOptions): any[];
  /**
   * Creates an `arrayMerge` strategy that deep merges items sharing an
   * identifier, read from a property key or returned by a function.
   */
  function mergeArraysByKey(
    selector: PropertyKey | ((item: any) => unknown)
  ): (target: any[], source: any[], options?: ArrayMergeOptions) => any[];

  function deepmerge<T1, T2>(
    target: T1,
    source: T2,
    options?: Options
  ): Merge<T1, T2>;
  function deepmerge<T>(target: Partial<T>, source: Partial<T>, options?: Options): T;
}

export = deepmerge;
