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
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_loglevel: 'error' },
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
  limitErrorType
];
`;
}

function moduleSource() {
  return `
import merge, {
  DeepMergeLimitError,
  UnsafeKeyError,
  all,
  deepmerge,
  isMergeableObject,
  type Options
} from '@stackline/deepmerge';

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

void [
  right,
  nestedRight,
  combinedOne,
  combinedTwo,
  mergeable,
  unsafeError,
  limitError
];
`;
}
