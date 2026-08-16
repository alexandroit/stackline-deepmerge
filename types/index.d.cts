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

  interface Options {
    arrayMerge?(target: any[], source: any[], options: ArrayMergeOptions): any[];
    clone?: boolean;
    customMerge?(
      key: PropertyKey,
      options?: Options
    ): ((target: any, source: any, options?: Options) => any) | undefined;
    isMergeableObject?(value: object): boolean;
    maxDepth?: number;
    maxKeys?: number;
    onUnsafeKey?: UnsafeKeyAction;
  }

  interface ArrayMergeOptions extends Options {
    arrayMerge(target: any[], source: any[], options: ArrayMergeOptions): any[];
    cloneUnlessOtherwiseSpecified<T>(value: T, options?: Options): T;
    isMergeableObject(value: object): boolean;
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

  function deepmerge<T1, T2>(
    target: T1,
    source: T2,
    options?: Options
  ): Merge<T1, T2>;
  function deepmerge<T>(target: Partial<T>, source: Partial<T>, options?: Options): T;
}

export = deepmerge;
