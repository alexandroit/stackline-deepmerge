import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { access, readFile, stat } from 'node:fs/promises';

import esmDefault, * as esm from '../dist/index.js';

const require = createRequire(import.meta.url);
const commonjs = require('../dist/index.cjs');
const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

assert.equal(Object.keys(packageJson.dependencies || {}).length, 0);
assert.equal(typeof commonjs, 'function');
assert.equal(commonjs.default, commonjs);
assert.equal(esmDefault, esm.deepmerge);
assert.deepEqual(
  commonjs({ config: { retries: 2 } }, { config: { timeout: 5000 } }),
  esmDefault({ config: { retries: 2 } }, { config: { timeout: 5000 } })
);

for (const file of [
  'index.cjs',
  'index.cjs.map',
  'index.d.cts',
  'index.d.mts',
  'index.d.ts',
  'index.js',
  'index.js.map',
  'index.min.js',
  'index.min.js.map'
]) {
  await access(new URL(`../dist/${file}`, import.meta.url));
}

const minified = await stat(new URL('../dist/index.min.js', import.meta.url));
assert.ok(minified.size < 10000, `minified bundle is ${minified.size} bytes`);

console.log(
  JSON.stringify({
    cjs: true,
    esm: true,
    minifiedBytes: minified.size,
    runtimeDependencies: 0,
    version: packageJson.version
  })
);
