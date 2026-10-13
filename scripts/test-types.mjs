import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const version =
  process.argv[2] ||
  process.env.TYPESCRIPT_VERSION ||
  packageJson.devDependencies.typescript;
const major = Number.parseInt(version, 10);
const work = await mkdtemp(path.join(os.tmpdir(), 'stackline-deepmerge-types-'));
const packDirectory = path.join(work, 'pack');
const appDirectory = path.join(work, 'app');

try {
  await mkdir(packDirectory);
  await mkdir(appDirectory);

  const packOutput = run(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', packDirectory],
    root
  );
  const [{ filename }] = JSON.parse(packOutput);
  const tarball = path.join(packDirectory, filename);

  run('npm', ['init', '--yes'], appDirectory);
  run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      `typescript@${version}`,
      tarball
    ],
    appDirectory
  );

  await cp(
    path.join(appDirectory, 'node_modules', '@stackline', 'deepmerge'),
    path.join(appDirectory, 'node_modules', 'deepmerge'),
    { recursive: true }
  );

  await writeFile(path.join(appDirectory, 'common.ts'), commonSource(), 'utf8');
  const files = ['common.ts'];
  if (major >= 4 && (major > 4 || Number(version.split('.')[1]) >= 7)) {
    await writeFile(path.join(appDirectory, 'module.mts'), moduleSource(), 'utf8');
    files.push('module.mts');
  }

  const modernModule = files.includes('module.mts');
  await writeFile(
    path.join(appDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          esModuleInterop: true,
          lib: ['ES2020'],
          module: modernModule ? 'Node16' : 'commonjs',
          moduleResolution: modernModule ? 'Node16' : 'node',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2018'
        },
        files
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  run(path.join(appDirectory, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], appDirectory);
  console.log(`TypeScript ${version} package compatibility passed`);
} finally {
  if (!process.env.KEEP_TYPES_TEST) await rm(work, { force: true, recursive: true });
}

function run(command, args, cwd) {
  const env = { ...process.env, npm_config_loglevel: 'error' };
  delete env.npm_config_dry_run;
  delete env.NPM_CONFIG_DRY_RUN;

  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function commonSource() {
  return `
import merge = require('@stackline/deepmerge');
import legacyName = require('deepmerge');

const merged = merge(
  { shared: 'before', nested: { left: 1 }, list: [1] },
  { shared: 42, nested: { right: true }, list: ['two'] }
);
const shared: number = merged.shared;
const left: number = merged.nested.left;
const right: boolean = merged.nested.right;
const listValue: number | string = merged.list[0];

interface Config {
  enabled?: boolean;
  nested?: { retries?: number };
}

const explicit = merge<Config>(
  { enabled: false },
  { nested: { retries: 3 } }
);
const retries: number | undefined = explicit.nested && explicit.nested.retries;

const options: merge.Options = {
  maxDepth: 100,
  maxKeys: 1000,
  onUnsafeKey: 'throw',
  arrayMerge: (_target, source) => source
};

const aliased = legacyName({ direct: true }, { alias: true }, options);
const aliasValue: boolean = aliased.alias;
const allResult = merge.all([{ first: true }, { second: true }]);
const allFirst: boolean = allResult.first;
const allSecond: boolean = allResult.second;
const staticResult = merge.deepmerge({ staticLeft: 1 }, { staticRight: 'two' });
const staticRight: string = staticResult.staticRight;
const mergeable: boolean = merge.isMergeableObject({});
const unsafeErrorType: typeof merge.UnsafeKeyError = merge.UnsafeKeyError;
const limitErrorType: typeof merge.DeepMergeLimitError = merge.DeepMergeLimitError;

// Patterns written against the upstream deepmerge 4 declarations.
const legacyOptions: legacyName.Options = {
  clone: true,
  isMergeableObject: (value: object) => !Array.isArray(value),
  customMerge: (key: string) =>
    key === 'name' ? (left: any, right: any) => left + right : undefined,
  arrayMerge: (
    target: any[],
    source: any[],
    arrayOptions?: legacyName.ArrayMergeOptions
  ) =>
    arrayOptions
      ? source.map((item) => arrayOptions.cloneUnlessOtherwiseSpecified(item, arrayOptions))
      : target
};
const legacyAll = legacyName.all<Config>([{ enabled: true }, {}], legacyOptions);
const legacyEnabled: boolean | undefined = legacyAll.enabled;

const hardened = merge.strict({ a: 1 }, { b: 'two' });
const hardenedB: string = hardened.b;
const configured = merge.createDeepmerge({
  arrayMerge: merge.overwriteArrays,
  customMergeScope: 'all',
  mergeCollections: true,
  skipUndefined: true,
  unsafeKeys: 'compatible',
  customMerge: (key, _options, context) =>
    context && context.path.length > 1 && key === 'count'
      ? (left: number, right: number) => left + right
      : undefined
});
const configuredResult = configured.all([{ count: 1 }, { count: 2 }]);
const strategies: Array<merge.Options['arrayMerge']> = [
  merge.mergeArraysByKey('id'),
  merge.mergeArraysByKey((item: { name: string }) => item.name),
  merge.mergeArraysByIndex,
  merge.concatUniqueArrays,
  merge.overwriteArrays
];
const plain: boolean = merge.isPlainMergeableObject({});
const strictDepth: 1000 = merge.strictOptions.maxDepth;

void [
  shared,
  left,
  right,
  listValue,
  retries,
  aliasValue,
  allResult,
  allFirst,
  allSecond,
  staticRight,
  mergeable,
  unsafeErrorType,
  limitErrorType,
  legacyEnabled,
  hardenedB,
  configuredResult,
  strategies,
  plain,
  strictDepth
];
`;
}

function moduleSource() {
  return `
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
  strictOptions,
  type CustomMergeContext,
  type Options
} from '@stackline/deepmerge';
import legacyName from 'deepmerge';

const options: Options = { onUnsafeKey: 'skip' };
const direct = merge({ left: 1 }, { right: 'two' }, options);
const named = deepmerge({ nested: { left: true } }, { nested: { right: true } });
const right: string = direct.right;
const nestedRight: boolean = named.nested.right;
const combined = all([{ one: 1 }, { two: 2 }]);
const combinedOne: number = combined.one;
const combinedTwo: number = combined.two;
const mergeable: boolean = isMergeableObject({});
const unsafeError = new UnsafeKeyError('__proto__', []);
const limitError = new DeepMergeLimitError('depth', 1, []);

// Default-import statics behave like deepmerge 4 for drop-in ESM consumers.
const staticAll = merge.all([{ one: 1 }, { two: 'two' }]);
const staticTwo: string = staticAll.two;
const aliasAll = legacyName.all([{ alias: true }, { next: 1 }]);
const aliasNext: number = aliasAll.next;
const staticStrict = merge.strict({ a: 1 }, { b: true });
const staticB: boolean = staticStrict.b;

const context = (_key: PropertyKey, _options?: Options, value?: CustomMergeContext) =>
  value && value.target !== value.source ? undefined : undefined;
const configured = createDeepmerge({ customMerge: context, arrayMerge: mergeArraysByIndex });
const configuredResult = configured({ a: [1] }, { a: [2] });
const hardened = strict.all([{ a: 1 }, { b: 2 }]);
const hardenedB: number = hardened.b;
const plain: boolean = isPlainMergeableObject([]);
const keyLimit: 100000 = strictOptions.maxKeys;
const strategies: Array<Options['arrayMerge']> = [
  overwriteArrays,
  concatUniqueArrays,
  mergeArraysByIndex,
  mergeArraysByKey('id'),
  merge.mergeArraysByKey(Symbol.for('id'))
];

void [
  right,
  nestedRight,
  combinedOne,
  combinedTwo,
  mergeable,
  unsafeError,
  limitError,
  staticTwo,
  aliasNext,
  staticB,
  configuredResult,
  hardenedB,
  plain,
  keyLimit,
  strategies
];
`;
}
