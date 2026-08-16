import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli =
  process.platform === 'win32'
    ? path.join(
        path.dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npm-cli.js'
      )
    : null;
const work = await mkdtemp(path.join(os.tmpdir(), 'stackline-deepmerge-install-'));

try {
  const tarball = process.argv[2]
    ? path.resolve(process.argv[2])
    : await createTarball(path.join(work, 'artifact'));

  await smokeDirect(tarball, path.join(work, 'direct'));
  await smokeAlias(tarball, path.join(work, 'alias'));

  const packageJson = JSON.parse(
    await readFile(path.join(root, 'package.json'), 'utf8')
  );
  console.log(
    `${packageJson.name}@${packageJson.version} clean-install smoke passed on ${process.version}`
  );
} finally {
  if (!process.env.KEEP_INSTALL_TEST) {
    await rm(work, { force: true, recursive: true });
  }
}

async function createTarball(directory) {
  await mkdir(directory, { recursive: true });
  const output = runNpm(
    ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
    root
  );
  const [{ filename }] = JSON.parse(output);
  return path.join(directory, filename);
}

async function smokeDirect(tarball, directory) {
  await prepare(directory, {
    '@stackline/deepmerge': `file:${tarball}`
  });

  await writeFile(
    path.join(directory, 'smoke.cjs'),
    `'use strict';
const assert = require('assert');
const merge = require('@stackline/deepmerge');
const payload = JSON.parse('{"safe":true,"constructor":{"prototype":{"polluted":true}}}');
const result = merge({ nested: { left: true } }, { nested: { right: true }, payload });
assert.strictEqual(typeof merge, 'function');
assert.strictEqual(merge.default, merge);
assert.deepStrictEqual(result.nested, { left: true, right: true });
assert.deepStrictEqual(result.payload, { safe: true });
assert.strictEqual(Object.prototype.polluted, undefined);
`,
    'utf8'
  );

  await writeFile(
    path.join(directory, 'smoke.mjs'),
    `import assert from 'assert';
import merge, { all, deepmerge } from '@stackline/deepmerge';
assert.strictEqual(merge, deepmerge);
assert.deepStrictEqual(all([{ esm: true }, { installed: true }]), { esm: true, installed: true });
`,
    'utf8'
  );

  run(process.execPath, ['smoke.cjs'], directory);
  run(process.execPath, ['smoke.mjs'], directory);
  if (!process.env.SKIP_INSTALL_AUDIT) {
    runNpm(['audit', '--omit=dev', '--audit-level=high'], directory);
  }
}

async function smokeAlias(tarball, directory) {
  await prepare(directory, { deepmerge: `file:${tarball}` });

  await writeFile(
    path.join(directory, 'smoke.cjs'),
    `'use strict';
const assert = require('assert');
const merge = require('deepmerge');
assert.strictEqual(typeof merge, 'function');
assert.deepStrictEqual(merge({ alias: { left: 1 } }, { alias: { right: 2 } }), {
  alias: { left: 1, right: 2 }
});
`,
    'utf8'
  );

  await writeFile(
    path.join(directory, 'smoke.mjs'),
    `import assert from 'assert';
import merge from 'deepmerge';
assert.deepStrictEqual(merge({ alias: true }, { esm: true }), { alias: true, esm: true });
`,
    'utf8'
  );

  run(process.execPath, ['smoke.cjs'], directory);
  run(process.execPath, ['smoke.mjs'], directory);
}

async function prepare(directory, dependencies) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, 'package.json'),
    `${JSON.stringify({ private: true, dependencies }, null, 2)}\n`,
    'utf8'
  );
  runNpm(['install', '--ignore-scripts', '--no-fund'], directory);
}

function runNpm(args, cwd) {
  return npmCli
    ? run(process.execPath, [npmCli, ...args], cwd)
    : run('npm', args, cwd);
}

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, npm_config_loglevel: 'error' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}
