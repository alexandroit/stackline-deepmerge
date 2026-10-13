// Runs the upstream deepmerge 4.3.1 test suite and README examples against
// this package's CommonJS build. Requires network access to GitHub and npm.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstreamTag = 'v4.3.1';
const upstreamCommit = '5b87756a5671635679001cbac72aa42f23472c81';
const testDependencies = [
  'tape@4.17.0',
  'is-mergeable-object@1.1.0',
  'is-plain-object@5.1.0',
  'jsmd@1.1.0'
];
const work = await mkdtemp(path.join(os.tmpdir(), 'stackline-deepmerge-upstream-'));
const repository = path.join(work, 'deepmerge');

try {
  run('git', [
    'clone',
    '--quiet',
    '--depth',
    '1',
    '--branch',
    upstreamTag,
    'https://github.com/TehShrike/deepmerge.git',
    repository
  ]);
  const commit = run('git', ['rev-parse', 'HEAD'], repository).trim();
  if (commit !== upstreamCommit) {
    throw new Error(`Unexpected upstream commit ${commit} for ${upstreamTag}`);
  }

  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-save', ...testDependencies],
    repository
  );
  await mkdir(path.join(repository, 'dist'), { recursive: true });
  await cp(path.join(root, 'dist', 'index.cjs'), path.join(repository, 'dist', 'cjs.js'));

  const bin = path.join(repository, 'node_modules', '.bin');
  const tests = ['merge', 'merge-all', 'custom-array-merge', 'custom-is-mergeable-object', 'prototype-poisoning']
    .map((name) => path.join('test', `${name}.js`));
  const output = run(path.join(bin, 'tape'), tests, repository);
  const summary = output.match(/# pass\s+(\d+)/);
  run(path.join(bin, 'jsmd'), ['readme.md'], repository);

  console.log(
    `deepmerge ${upstreamTag} suite passed against the Stackline build: ` +
      `${summary ? summary[1] : 'all'} assertions and the README examples`
  );
} finally {
  if (!process.env.KEEP_UPSTREAM_TEST) await rm(work, { force: true, recursive: true });
}

function run(command, args, cwd = root) {
  const env = { ...process.env, npm_config_loglevel: 'error' };
  delete env.npm_config_dry_run;
  delete env.NPM_CONFIG_DRY_RUN;

  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}
