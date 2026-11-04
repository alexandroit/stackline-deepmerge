import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const baseline = 'node_modules/deepmerge';
const advisory = 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4';
const expires = '2026-12-04';
const runtimeFiles = ['index.cjs', 'index.js', 'index.min.js'];
const integrity = 'sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==';

export function reviewFixtureAudit(audit, manifest, lock, builds, packedFiles, today = new Date().toISOString().slice(0, 10)) {
  assert.equal(audit.error, undefined, JSON.stringify(audit.error));
  assert.equal(audit.auditReportVersion, 2);
  assert.ok(audit.vulnerabilities && audit.metadata?.vulnerabilities);
  const findings = Object.entries(audit.vulnerabilities);
  assert.equal(audit.metadata.vulnerabilities.total, findings.length, 'Audit count and findings disagree');
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.deepEqual(manifest[key] || {}, {}, 'Production graph must remain empty');
    assert.deepEqual(lock.packages[''][key] || {}, {}, 'Lock production graph must remain empty');
  }
  assert.equal(manifest.devDependencies.deepmerge, '4.3.1', 'Preserve the upstream oracle identity');
  assert.equal(lock.packages[''].devDependencies.deepmerge, '4.3.1');
  const frozen = lock.packages[baseline];
  assert.equal(frozen.version, '4.3.1');
  assert.equal(frozen.dev, true);
  assert.ok(!frozen.name || frozen.name === 'deepmerge');
  assert.equal(frozen.resolved, 'https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz');
  assert.equal(frozen.integrity, integrity);
  const parents = [];
  const locations = [];
  for (const [location, metadata] of Object.entries(lock.packages)) {
    if (location.endsWith('/deepmerge') || metadata.name === 'deepmerge' || metadata.resolved === frozen.resolved) locations.push(location);
    for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies']) {
      for (const [name, range] of Object.entries(metadata[key] || {})) {
        if (name === 'deepmerge' || range.startsWith('npm:deepmerge@')) parents.push(`${location}:${key}:${name}`);
      }
    }
  }
  assert.deepEqual(locations, [baseline], 'Only one frozen upstream fixture is permitted');
  assert.deepEqual(parents, [':devDependencies:deepmerge'], 'Only the root development fixture may reference deepmerge');

  assert.deepEqual(Object.keys(builds).sort(), runtimeFiles, 'Evidence for all runtime bundles is required');
  for (const build of Object.values(builds)) {
    assert.ok(Array.isArray(build.inputs) && build.inputs.includes('src/index.js'));
    assert.ok(build.inputs.every(input => /^src\/(?!.*\.\.)/.test(input)), 'Runtime bundles may contain only this package source');
    assert.deepEqual(build.imports, [], 'Runtime bundles must not import dependencies');
    assert.match(build.sha256, /^[a-f0-9]{64}$/);
    assert.equal(build.actualSha256, build.sha256, 'Bundle changed after its inputs were measured');
  }
  assert.ok(Array.isArray(packedFiles) && packedFiles.length > 0);
  for (const filename of runtimeFiles) assert.ok(packedFiles.includes(`dist/${filename}`));
  for (const filename of packedFiles) {
    assert.doesNotMatch(filename, /(?:^|\/)(?:node_modules|test|fixtures|benchmark|scripts|build-evidence)(?:\/|$)/, 'Comparison fixtures and tooling must not be published');
  }
  if (!findings.length) {
    assert.deepEqual(audit.metadata.vulnerabilities, { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 });
    return [];
  }
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(today <= expires, 'Fixture exception expired; review the advisory and isolation again');
  assert.deepEqual(audit.metadata.vulnerabilities, { info: 0, low: 1, moderate: 0, high: 0, critical: 0, total: 1 });
  assert.deepEqual(findings.map(([name]) => name), ['deepmerge']);
  const finding = audit.vulnerabilities.deepmerge;
  assert.equal(finding.name, 'deepmerge');
  assert.equal(finding.isDirect, true);
  assert.equal(finding.severity, 'low');
  assert.deepEqual(finding.nodes, [baseline]);
  assert.deepEqual(finding.effects, []);
  assert.equal(finding.via.length, 1);
  const via = finding.via[0];
  assert.equal(via.name, 'deepmerge');
  assert.equal(via.dependency, 'deepmerge');
  assert.equal(via.url, advisory, 'Unreviewed advisory');
  assert.equal(via.severity, 'low');
  assert.equal(via.range, '>=4.2.0 <=4.3.1');
  return [advisory];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const run = (command, args) => spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const readJson = filename => JSON.parse(readFileSync(new URL(filename, root), 'utf8'));
  const production = run(npm, ['audit', '--omit=dev', '--json']);
  assert.equal(production.status, 0, production.stdout + production.stderr);
  assert.equal(JSON.parse(production.stdout).metadata.vulnerabilities.total, 0);
  const result = run(npm, ['audit', '--json']);
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.ok(result.status === 0 || result.status === 1, 'Unexpected npm audit status');
  const audit = JSON.parse(result.stdout);
  console.log(JSON.stringify({ rawAuditVulnerabilities: audit.metadata?.vulnerabilities, findings: audit.vulnerabilities }, null, 2));
  assert.equal(result.status, Object.keys(audit.vulnerabilities || {}).length ? 1 : 0, 'Audit status and findings disagree');
  const pack = run(npm, ['pack', '--dry-run', '--ignore-scripts', '--json']);
  assert.equal(pack.status, 0, pack.stdout + pack.stderr);
  const packed = JSON.parse(pack.stdout);
  assert.equal(packed.length, 1);
  const manifest = readJson('package.json');
  assert.equal(packed[0].name, manifest.name);
  assert.equal(packed[0].version, manifest.version);
  const builds = readJson('build-evidence/runtime-inputs.json');
  for (const filename of runtimeFiles) {
    builds[filename].actualSha256 = createHash('sha256').update(readFileSync(new URL(`dist/${filename}`, root))).digest('hex');
  }
  const accepted = reviewFixtureAudit(audit, manifest, readJson('package-lock.json'), builds, packed[0].files.map(file => file.path));
  const installed = readJson('node_modules/deepmerge/package.json');
  assert.equal(installed.name, 'deepmerge');
  assert.equal(installed.version, '4.3.1');
  const regressions = run(process.execPath, ['--test', 'test/security.test.mjs', 'test/package.test.mjs']);
  assert.equal(regressions.status, 0, regressions.stdout + regressions.stderr);
  console.log(regressions.stdout);
  console.log(JSON.stringify({ reviewedFixtureAdvisories: accepted, expires: accepted.length ? expires : null }, null, 2));
  if (accepted.length) console.warn('The full development audit still contains 1 real LOW advisory in the frozen upstream test oracle. Production and all measured runtime bundles exclude it. See SECURITY.md.');
}
