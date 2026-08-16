import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('../site-dist/', import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL('package.json', root), 'utf8')
);

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });
await cp(new URL('docs-site/', root), output, { recursive: true });
await cp(new URL('dist/index.min.js', root), new URL('index.min.js', output));
await cp(
  new URL('dist/index.min.js.map', root),
  new URL('index.min.js.map', output)
);
await writeFile(
  new URL('package-meta.json', output),
  `${JSON.stringify(
    {
      name: packageJson.name,
      version: packageJson.version,
      runtimeDependencies: Object.keys(packageJson.dependencies || {}).length
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log(`Documentation built for ${packageJson.name}@${packageJson.version}`);
