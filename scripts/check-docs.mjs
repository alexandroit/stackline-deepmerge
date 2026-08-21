import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const site = new URL('../site-dist/', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const metadata = JSON.parse(await readFile(new URL('package-meta.json', site), 'utf8'));
const html = await readFile(new URL('index.html', site), 'utf8');
const app = await readFile(new URL('app.js', site), 'utf8');
const robots = await readFile(new URL('robots.txt', site), 'utf8');
const llms = await readFile(new URL('llms.txt', site), 'utf8');
const adoption = await readFile(new URL('guides/adoption.md', site), 'utf8');
const benchmark = await readFile(new URL('guides/benchmarks.md', site), 'utf8');
const example = await readFile(new URL('examples/secure-config.mjs', site), 'utf8');
const image = await stat(new URL('assets/deepmerge-structure.jpg', site));
const bundle = await stat(new URL('index.min.js', site));

assert(metadata.name === packageJson.name, 'documentation package name is stale');
assert(metadata.version === packageJson.version, 'documentation version is stale');
assert(metadata.runtimeDependencies === 0, 'documentation dependency count is stale');
assert(
  html.includes('<link rel="canonical" href="https://alexandro.net/docs/vanilla/deepmerge/">'),
  'canonical documentation URL is missing'
);
assert(html.includes('SoftwareSourceCode'), 'structured software metadata is missing');
assert(html.includes('index,follow'), 'indexable robots metadata is missing');
assert(html.includes('./index.min.js'), 'production package bundle is not loaded');
assert(app.includes('globalThis.StacklineDeepmerge'), 'playground does not use package bundle');
assert(app.includes("onUnsafeKey: mode"), 'unsafe-key mode is not wired to the playground');
assert(robots.includes('User-agent: *\nAllow: /'), 'documentation robots policy is not open');
assert(llms.includes('npm install @stackline/deepmerge'), 'LLM install reference is missing');
assert(adoption.includes('deepmerge@npm:@stackline/deepmerge'), 'alias guide is missing');
assert(benchmark.includes('BENCHMARK_ITERATIONS'), 'benchmark methodology is missing');
assert(example.includes("from '@stackline/deepmerge'"), 'executable example is missing');
assert(html.includes('./analytics.js'), 'documentation analytics is missing');
assert(!app.includes("gtag('event'"), 'playground must not record user input');
assert(image.size < 150000, `documentation image is ${image.size} bytes`);
assert(bundle.size < 10000, `browser bundle is ${bundle.size} bytes`);

console.log(
  JSON.stringify({
    bundleBytes: bundle.size,
    imageBytes: image.size,
    name: metadata.name,
    version: metadata.version
  })
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
