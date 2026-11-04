import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const hash = (data, algorithm = 'sha512') => createHash(algorithm).update(data).digest('hex');
export function verifyIdentity(run, manifest, statement, digest, repo, packageName) {
  assert.equal(run.conclusion, 'success');
  assert.equal(run.status, 'completed');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.path, '.github/workflows/publish.yml');
  assert.equal(run.head_repository.full_name, repo);
  assert.equal(manifest.name, packageName);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.repository.url, `git+https://github.com/${repo}.git`);
  assert.equal(statement.predicateType, 'https://slsa.dev/provenance/v1');
  assert(statement.subject.some(s => s.digest?.sha512 === digest));
  assert(statement.predicate.buildDefinition.resolvedDependencies.some(d =>
    d.digest?.gitCommit === run.head_sha && d.uri?.startsWith(`git+https://github.com/${repo}@`)));
  assert.match(statement.predicate.runDetails.metadata.invocationId,
    new RegExp(`^https://github\\.com/${repo}/actions/runs/${run.id}/attempts/[0-9]+$`));
}

function gh(args, input) {
  return execFileSync('gh', args, {encoding: 'utf8', input, maxBuffer: 16 * 1024 * 1024}).trim();
}
function api(route, body) {
  return JSON.parse(gh(['api', route, ...(body ? ['--method', 'POST', '--input', '-'] : [])], body && JSON.stringify(body)));
}
function optionalApi(route) {
  const r = spawnSync('gh', ['api', route], {encoding: 'utf8'});
  if (r.status !== 0 && /HTTP 404/.test(r.stderr)) return null;
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
async function registry(url) {
  assert.equal(new URL(url).origin, 'https://registry.npmjs.org');
  for (let i = 0; i < 120; i++) {
    const r = await fetch(url, {signal: AbortSignal.timeout(30_000)});
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (r.status !== 404 || i === 119) throw new Error(`Registry HTTP ${r.status}: ${url}`);
    await delay(5_000);
  }
}
function archives(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory()
    ? archives(path.join(dir, e.name)) : e.name.endsWith('.tgz') ? [path.join(dir, e.name)] : []);
}
export async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const packageName = process.env.PACKAGE_NAME;
  const runId = process.env.PUBLICATION_RUN_ID;
  assert.match(repo, /^alexandroit\/[A-Za-z0-9_.-]+$/);
  assert.match(packageName, /^@stackline\/[a-z0-9-]+$/);
  assert.match(runId, /^[0-9]+$/);
  const route = `repos/${repo}`;
  const run = api(`${route}/actions/runs/${runId}`);
  assert.equal(run.conclusion, 'success');
  assert.equal(run.path, '.github/workflows/publish.yml');
  const root = path.join(process.env.RUNNER_TEMP, `github-release-${runId}`);
  const downloaded = path.join(root, 'downloaded');
  const output = path.join(root, 'release');
  mkdirSync(downloaded, {recursive: true}); mkdirSync(output, {recursive: true});
  gh(['run', 'download', runId, '--repo', repo, '--dir', downloaded]);
  const candidates = archives(downloaded).map(file => {
    const result = spawnSync('tar', ['-xOf', file, 'package/package.json'], {encoding: 'utf8'});
    if (result.status !== 0) return null;
    return {file, manifest: JSON.parse(result.stdout)};
  }).filter(c => c && c.manifest.name === packageName);
  assert(candidates.length > 0, 'Publication artifact is missing');
  const {file, manifest} = candidates[0];
  const bytes = readFileSync(file); const digest = hash(bytes);
  assert(candidates.every(c => hash(readFileSync(c.file)) === digest), 'Conflicting publication artifacts');
  const metadata = JSON.parse(await registry(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${manifest.version}`));
  assert.equal(metadata.name, packageName); assert.equal(metadata.version, manifest.version);
  assert.equal(metadata.dist.integrity, 'sha512-' + createHash('sha512').update(bytes).digest('base64'));
  assert.equal(hash(await registry(metadata.dist.tarball)), digest);
  const attestations = JSON.parse(await registry(metadata.dist.attestations.url));
  const statements = attestations.attestations.map(a => JSON.parse(Buffer.from(a.bundle.dsseEnvelope.payload, 'base64')));
  const statement = statements.find(s => s.predicateType === 'https://slsa.dev/provenance/v1');
  verifyIdentity(run, manifest, statement, digest, repo, packageName);
  const filename = `${packageName.slice(1).replace('/', '-')}-${manifest.version}.tgz`;
  writeFileSync(path.join(output, filename), bytes);
  writeFileSync(path.join(output, 'SHA512SUMS'), `${digest}  ${filename}\n`);
  for (const [name, value] of Object.entries({'npm-metadata.json': metadata, 'npm-attestations.json': attestations,
    'verification.json': {status: 'PASS', package: `${packageName}@${manifest.version}`, sourceCommit: run.head_sha,
      publicationRun: run.html_url, sha512: digest, registryMatchesPublicationArtifact: true}})) {
    writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
  }
  const tag = process.env.RELEASE_TAG_PREFIX + manifest.version;
  assert.match(tag, /^(v|stackline-v)\d+\.\d+\.\d+$/);
  let ref = optionalApi(`${route}/git/ref/tags/${tag}`);
  if (!ref) ref = api(`${route}/git/refs`, {ref: `refs/tags/${tag}`, sha: run.head_sha});
  let object = ref.object;
  for (let i = 0; object.type === 'tag' && i < 8; i++) object = api(`${route}/git/tags/${object.sha}`).object;
  assert.equal(object.type, 'commit'); assert.equal(object.sha, run.head_sha, 'Existing tag points to another commit');
  const notes = `Release of ${packageName} ${manifest.version}, using the exact npm package published by GitHub Actions.\n\n` +
    `- npm: https://www.npmjs.com/package/${packageName}/v/${manifest.version}\n` +
    `- Source: https://github.com/${repo}/commit/${run.head_sha}\n` +
    `- Publication workflow: ${run.html_url}\n` +
    `- SHA-512: \`${digest}\`\n\n` +
    'The attached tarball matches the original publication artifact and npm registry bytes. Package identity, source commit, publication run and SLSA provenance were verified. Existing npm versions are not republished.\n';
  let release = optionalApi(`${route}/releases/tags/${tag}`);
  if (!release) release = api(`${route}/releases?per_page=100`).find(r => r.tag_name === tag);
  if (!release) release = api(`${route}/releases`, {tag_name: tag, name: `${packageName} ${manifest.version}`, body: notes, draft: true});
  const files = readdirSync(output).sort();
  if (release.draft) {
    gh(['release', 'upload', tag, ...files.map(f => path.join(output, f)), '--repo', repo, '--clobber']);
    const latest = JSON.parse(await registry(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`));
    gh(['api', '--method', 'PATCH', `${route}/releases/${release.id}`, '--input', '-'],
      JSON.stringify({draft: false, make_latest: latest.version === manifest.version ? 'true' : 'false'}));
  }
  release = api(`${route}/releases/tags/${tag}`);
  assert.equal(release.draft, false); assert.equal(release.immutable, true);
  for (const name of files) {
    const asset = release.assets.find(a => a.name === name);
    assert(asset, `Missing asset ${name}`);
    assert.equal(asset.digest, 'sha256:' + hash(readFileSync(path.join(output, name)), 'sha256'));
  }
  console.log(JSON.stringify({status: 'PASS', release: release.html_url, version: manifest.version, sourceCommit: run.head_sha}));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
