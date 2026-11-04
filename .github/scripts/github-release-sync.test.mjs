import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyIdentity} from './github-release-sync.mjs';
const repo = 'alexandroit/sheetjs', name = '@stackline/xlsx', digest = 'abc';
function fixture() {
  return [{id: 123, status: 'completed', conclusion: 'success', event: 'workflow_dispatch',
    path: '.github/workflows/publish.yml', head_sha: 'source', head_repository: {full_name: repo}},
  {name, version: '1.0.10', repository: {url: `git+https://github.com/${repo}.git`}},
  {predicateType: 'https://slsa.dev/provenance/v1', subject: [{digest: {sha512: digest}}], predicate: {
    buildDefinition: {resolvedDependencies: [{uri: `git+https://github.com/${repo}@refs/tags/v1.0.10`, digest: {gitCommit: 'source'}}]},
    runDetails: {metadata: {invocationId: `https://github.com/${repo}/actions/runs/123/attempts/1`}}}}];
}
test('accepts the exact successful publication identity', () => verifyIdentity(...fixture(), digest, repo, name));
for (const [label, alter] of [
  ['failed run', f => {f[0].conclusion = 'failure';}],
  ['fork repository', f => {f[0].head_repository.full_name = 'other/sheetjs';}],
  ['different workflow', f => {f[0].path = '.github/workflows/ci.yml';}],
  ['different package', f => {f[1].name = '@stackline/other';}],
  ['different bytes', f => {f[2].subject[0].digest.sha512 = 'other';}],
  ['different source', f => {f[2].predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = 'other';}],
  ['different invocation', f => {f[2].predicate.runDetails.metadata.invocationId = f[2].predicate.runDetails.metadata.invocationId.replace('/runs/123/', '/runs/124/');}],
]) test(`rejects ${label}`, () => {const f = fixture(); alter(f); assert.throws(() => verifyIdentity(...f, digest, repo, name));});
