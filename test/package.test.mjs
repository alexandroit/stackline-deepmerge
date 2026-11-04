import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import legacyMerge from 'deepmerge';

import esmDefault, * as esm from '../dist/index.js';

const require = createRequire(import.meta.url);

test('CommonJS exposes a callable deepmerge-compatible export', () => {
  const commonjs = require('../dist/index.cjs');
  assert.equal(typeof commonjs, 'function');
  assert.equal(commonjs.default, commonjs);
  assert.equal(commonjs.deepmerge, commonjs);
  assert.equal(typeof commonjs.all, 'function');
  assert.equal(typeof commonjs.UnsafeKeyError, 'function');
  assert.deepEqual(commonjs({ nested: { left: 1 } }, { nested: { right: 2 } }), {
    nested: { left: 1, right: 2 }
  });
});

test('ESM exposes default and named APIs', () => {
  assert.equal(esmDefault, esm.deepmerge);
  assert.equal(esmDefault.all, esm.all);
  assert.equal(typeof esm.isMergeableObject, 'function');
  assert.equal(typeof esm.DeepMergeLimitError, 'function');
});

test('browser build exposes a callable global', async () => {
  const code = await readFile(new URL('../dist/index.min.js', import.meta.url), 'utf8');
  const context = { globalThis: {} };
  vm.runInNewContext(code, context, { filename: 'index.min.js' });
  const browserMerge = context.globalThis.StacklineDeepmerge;
  assert.equal(typeof browserMerge, 'function');
  assert.equal(
    JSON.stringify(browserMerge({ one: 1 }, { nested: { two: 2 } })),
    JSON.stringify({ one: 1, nested: { two: 2 } })
  );
});

test('distribution is small and carries the license banner', async () => {
  const minified = new URL('../dist/index.min.js', import.meta.url);
  const code = await readFile(minified, 'utf8');
  const info = await stat(minified);
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.ok(
    code.startsWith(`/*! @stackline/deepmerge v${packageJson.version} | MIT */`)
  );
  assert.equal(code.includes('eval('), false);
  assert.equal(code.includes('new Function'), false);
  assert.ok(info.size < 12000, `browser bundle is ${info.size} bytes`);
});

test('all shipped runtime formats reject prototype poisoning accepted by the upstream oracle', async () => {
  const context = { globalThis: {} };
  vm.runInNewContext(await readFile(new URL('../dist/index.min.js', import.meta.url), 'utf8'), context);
  const attacks = [
    run => run(Object.create(null), JSON.parse('{"__proto__":{"isAdmin":true}}')),
    run => run(JSON.parse('{"__proto__":{"isAdmin":true}}'), {})
  ];
  for (const attack of attacks) {
    assert.equal(attack(legacyMerge).isAdmin, true, 'The frozen oracle must remain vulnerable');
    for (const run of [esmDefault, require('../dist/index.cjs'), context.globalThis.StacklineDeepmerge]) {
      const result = attack(run);
      assert.equal(result.isAdmin, undefined);
      assert.equal(Object.prototype.hasOwnProperty.call(result, '__proto__'), false);
    }
  }
  assert.equal({}.isAdmin, undefined);
});
