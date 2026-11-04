import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { reviewFixtureAudit } from './audit-source.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
function fixture() {
  const hash = 'a'.repeat(64);
  return {
    audit: {
      auditReportVersion: 2,
      metadata: { vulnerabilities: { info: 0, low: 1, moderate: 0, high: 0, critical: 0, total: 1 } },
      vulnerabilities: { deepmerge: {
        name: 'deepmerge', severity: 'low', isDirect: true, effects: [], nodes: ['node_modules/deepmerge'],
        via: [{ name: 'deepmerge', dependency: 'deepmerge', url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4', severity: 'low', range: '>=4.2.0 <=4.3.1' }]
      } }
    },
    manifest: read('package.json'),
    lock: read('package-lock.json'),
    builds: Object.fromEntries(['index.cjs', 'index.js', 'index.min.js'].map(name => [name, {
      inputs: ['src/index.js'], imports: [], sha256: hash, actualSha256: hash
    }])),
    packed: ['package.json', 'dist/index.cjs', 'dist/index.js', 'dist/index.min.js']
  };
}
const review = (data, today = '2026-11-04') => reviewFixtureAudit(data.audit, data.manifest, data.lock, data.builds, data.packed, today);
test('permits the reviewed low advisory only in the frozen isolated development oracle', () => {
  assert.deepEqual(review(fixture()), ['https://github.com/advisories/GHSA-gcqx-w48m-w2h4']);
});
for (const [name, mutate] of [
  ['unknown advisory', d => { d.audit.vulnerabilities.deepmerge.via[0].url = 'https://github.com/advisories/GHSA-new'; }],
  ['changed advisory severity', d => { d.audit.vulnerabilities.deepmerge.via[0].severity = 'high'; }],
  ['changed advisory range', d => { d.audit.vulnerabilities.deepmerge.via[0].range = '*'; }],
  ['new advisory on the oracle', d => { d.audit.vulnerabilities.deepmerge.via.push({ ...d.audit.vulnerabilities.deepmerge.via[0] }); }],
  ['additional vulnerable package', d => { d.audit.vulnerabilities.other = {}; d.audit.metadata.vulnerabilities.total++; }],
  ['another vulnerable path', d => { d.audit.vulnerabilities.deepmerge.nodes.push('node_modules/tool/node_modules/deepmerge'); }],
  ['new dependent metavulnerability', d => { d.audit.vulnerabilities.deepmerge.effects.push('tool'); }],
  ['production dependency', d => { d.manifest.dependencies = { deepmerge: '4.3.1' }; }],
  ['optional production dependency', d => { d.manifest.optionalDependencies = { deepmerge: '4.3.1' }; }],
  ['production lock edge', d => { d.lock.packages[''].dependencies = { deepmerge: '4.3.1' }; }],
  ['changed frozen version', d => { d.lock.packages['node_modules/deepmerge'].version = '4.3.0'; }],
  ['production lock node', d => { d.lock.packages['node_modules/deepmerge'].dev = false; }],
  ['changed fixture integrity', d => { d.lock.packages['node_modules/deepmerge'].integrity = 'sha512-changed'; }],
  ['untrusted fixture origin', d => { d.lock.packages['node_modules/deepmerge'].resolved = 'https://example.com/deepmerge.tgz'; }],
  ['alias replacing the oracle', d => { d.manifest.devDependencies.deepmerge = 'npm:@stackline/deepmerge@1.1.0'; }],
  ['another dependency on the oracle', d => { d.lock.packages['node_modules/tool'] = { dev: true, dependencies: { deepmerge: '4.3.1' } }; }],
  ['aliased dependency on the oracle', d => { d.lock.packages['node_modules/tool'] = { dev: true, dependencies: { other: 'npm:deepmerge@4.3.1' } }; }],
  ['second installed oracle', d => { d.lock.packages['node_modules/tool/node_modules/deepmerge'] = { ...d.lock.packages['node_modules/deepmerge'] }; }],
  ['fixture bundled into browser', d => { d.builds['index.min.js'].inputs.push('node_modules/deepmerge/index.js'); }],
  ['fixture bundled into CommonJS', d => { d.builds['index.cjs'].inputs.push('node_modules/deepmerge/index.js'); }],
  ['external runtime import', d => { d.builds['index.js'].imports.push({ path: 'deepmerge', external: true }); }],
  ['missing runtime evidence', d => { delete d.builds['index.cjs']; }],
  ['changed measured bundle', d => { d.builds['index.js'].actualSha256 = 'b'.repeat(64); }],
  ['fixture included in tarball', d => { d.packed.push('node_modules/deepmerge/index.js'); }],
  ['tests included in tarball', d => { d.packed.push('test/security.test.mjs'); }],
  ['missing packed bundle', d => { d.packed.pop(); }],
  ['audit service error', d => { d.audit.error = { message: 'unavailable' }; }],
  ['inconsistent audit total', d => { d.audit.metadata.vulnerabilities.total = 0; }]
]) {
  test(`rejects ${name}`, () => { const data = fixture(); mutate(data); assert.throws(() => review(data)); });
}
test('rejects an expired exception', () => { assert.throws(() => review(fixture(), '2026-12-05'), /expired/); });
test('reports no exception if the audit contains no findings', () => {
  const data = fixture();
  data.audit.vulnerabilities = {};
  data.audit.metadata.vulnerabilities = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  assert.deepEqual(review(data, '2026-12-05'), []);
});
