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

Build one tarball and identify its SHA-512 digest. Publish that exact file to
Verdaccio. The trusted GitHub workflow rebuilds from the reviewed commit,
requires the expected digest as input, and refuses to publish to npm unless the
bytes are identical.

```bash
version="$(node -p "require('./package.json').version")"
mkdir -p "release/$version"
npm pack --ignore-scripts --pack-destination "release/$version"
(cd "release/$version" && sha512sum *.tgz > SHA512SUMS)
```

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
7. Run `publish.yml` with the tarball's SHA-512 hex digest and watch it publish
   the byte-identical artifact through npm trusted publishing.
8. Download from public npm, compare SHA-512, and smoke-test.
9. Push the signed or annotated version tag.
10. Create the GitHub release.
11. Deploy and verify public documentation.
12. Record package metadata and validation evidence in project memory.

Published npm versions are immutable. Never reuse a version number.
