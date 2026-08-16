# Releasing

Only maintainers with npm scope access can publish a release.

## Required checks

```bash
npm ci
npm test
npm run test:attw
npm run benchmark
npm run audit:dependencies
npm pack --dry-run
```

Run the full TypeScript matrix and clean-install smoke test. Verify GitHub CI is
green on `main` before public npm publication.

## Artifact rule

Build one tarball and identify its SHA-512 digest. Publish that exact file to:

1. Verdaccio;
2. public npm.

Do not rebuild between registries. After each publish, install from that
registry in an empty project and test direct ESM, direct CommonJS, npm alias,
and TypeScript resolution.

## Release order

1. Update version, changelog, docs, and project memory.
2. Run all required checks.
3. Commit and push `main`.
4. Wait for GitHub checks.
5. Create the final tarball and digest.
6. Publish and smoke-test Verdaccio.
7. Publish and smoke-test public npm.
8. Push the signed or annotated version tag.
9. Create the GitHub release.
10. Deploy and verify public documentation.
11. Record package metadata and validation evidence in project memory.

Published npm versions are immutable. Never reuse a version number.
