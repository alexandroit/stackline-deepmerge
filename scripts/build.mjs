import { cp, mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const banner = `/*! ${packageJson.name} v${packageJson.version} | MIT */`;

await mkdir(dist, { recursive: true });

const shared = {
  banner: { js: banner },
  bundle: true,
  entryPoints: [new URL('src/index.js', root).pathname],
  legalComments: 'none',
  logLevel: 'warning',
  sourcemap: true,
  target: ['es2018']
};

await Promise.all([
  build({
    ...shared,
    format: 'esm',
    outfile: new URL('index.js', dist).pathname,
    platform: 'neutral'
  }),
  build({
    ...shared,
    footer: {
      js: [
        'var deepmergeExport = StacklineDeepmergeModule.default;',
        "Object.defineProperty(deepmergeExport, 'default', { value: deepmergeExport });",
        'module.exports = deepmergeExport;'
      ].join('\n')
    },
    format: 'iife',
    globalName: 'StacklineDeepmergeModule',
    outfile: new URL('index.cjs', dist).pathname,
    platform: 'node'
  }),
  build({
    ...shared,
    footer: {
      js: "(typeof globalThis !== 'undefined' ? globalThis : window).StacklineDeepmerge = StacklineDeepmergeModule.default;"
    },
    format: 'iife',
    globalName: 'StacklineDeepmergeModule',
    minify: true,
    outfile: new URL('index.min.js', dist).pathname,
    platform: 'browser'
  })
]);

await Promise.all([
  cp(new URL('types/index.d.ts', root), new URL('index.d.ts', dist)),
  cp(new URL('types/index.d.mts', root), new URL('index.d.mts', dist)),
  cp(new URL('types/index.d.cts', root), new URL('index.d.cts', dist))
]);
