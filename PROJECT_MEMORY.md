# Project Memory

## Permanent rules

- Public package: `@stackline/deepmerge`.
- Public repository: `https://github.com/alexandroit/stackline-deepmerge`.
- Public documentation: `https://alexandro.net/docs/vanilla/deepmerge/`.
- Primary branch: `main`; do not maintain a duplicate default branch.
- License: MIT.
- Runtime dependencies must remain zero unless a future release documents and
  justifies an exception.
- Preserve direct imports and the npm alias migration shape:
  `deepmerge@npm:@stackline/deepmerge`.
- Default results must match `deepmerge@4.3.1` for every input that deepmerge 4
  merges safely. New behavior is opt-in. Defaults change only where deepmerge
  4 crashes or returns an unsafe result, and each such difference is listed in
  `docs/COMPATIBILITY.md` with a test.
- Always drop `__proto__` from targets and sources at every depth
  (CVE-2026-93753). `constructor` and `prototype` follow deepmerge 4 by
  default and are dropped by `unsafeKeys: 'strict'` and the `strict` preset.
- Keep `docs/UPSTREAM.md` current: every upstream issue, pull request, branch,
  and fork with its status.
- Do not publish a release until tests, package validation, clean-install
  smoke tests, and GitHub CI pass.
- Publish the same validated tarball to Verdaccio and public npm.
- Keep TypeScript 3.9 compatibility throughout the 1.x line unless a future
  major explicitly changes the contract.

## 2026-08-15 to 2026-08-16 - Project creation and 1.0.0 release

Market decision:

- Deep object merge is a proven high-volume category. The official npm
  downloads API reported 353,418,274 downloads for `deepmerge` and
  493,506,292 for `lodash.merge` during 2026-07-11 through 2026-08-09.
- `deepmerge@4.3.1` was last published in March 2023. Its repository snapshot
  showed 59 open issues, including recurring ESM, TypeScript, and cycle needs.
- The selected opportunity is a secure, modern, low-migration implementation,
  not a broad utility collection.

Implementation contract:

- Original runtime implementation; upstream is used as a development-only
  behavioral reference.
- Immutable objects, concatenated arrays by default, source wins on type
  mismatch.
- Dangerous keys are skipped by default or throw `UnsafeKeyError` in strict
  mode.
- Cycles and shared references are preserved.
- Default limits: `maxDepth: 1000`, `maxKeys: 100000`.
- ESM, callable CommonJS, browser global, TypeScript resolver-specific
  declarations, and source maps.
- Node.js runtime floor: 14.17. Development toolchain: Node.js 20 or newer.

Validation completed before the first commit:

- 35 source and package tests passed.
- 5,000 deterministic JSON-compatible differential cases matched
  `deepmerge@4.3.1`.
- Coverage: 100% statements, lines, and functions; over 95% branches.
- `publint` passed without errors.
- `@arethetypeswrong/cli` reported no problems across Node 10 resolution,
  Node 16 CJS/ESM, and bundlers.
- TypeScript package tests passed on 3.9.10, 4.7.4, 4.9.5, 5.9.3, 6.0.3,
  and 7.0.2.
- Clean tarball installs passed in Node.js 14.17.6, 14.21.3, 16.20.2,
  18.20.8, 20.20.0, 22.23.2, and 24.19.0 containers.
- The ESM distribution passed in Deno 2.5.6 and Bun 1.2.22 containers.
- Full `npm audit` reported zero vulnerabilities. Registry signature audit
  verified all installed development packages and available attestations.
- GitHub Actions were updated to the current 2026 majors and pinned to exact
  immutable commit SHAs.
- A proposed third-party Markdown linter was rejected and removed after it
  introduced three audit findings. A zero-dependency local check replaced it.
- The public playground was tested in real Chromium at desktop and mobile
  widths. Security skip/throw modes, limits, responsive overflow, console
  errors, and package-bundle execution were verified.
- Initial benchmark on this machine: approximately 70,000 operations/second
  for the hardened package and 123,000 for `deepmerge@4.3.1` on the included
  nested configuration scenario. Treat as a local regression baseline.

Release status:

- Public npm package:
  `https://www.npmjs.com/package/@stackline/deepmerge`.
- Public GitHub repository:
  `https://github.com/alexandroit/stackline-deepmerge`.
- Public documentation:
  `https://alexandro.net/docs/vanilla/deepmerge/`.
- Version `1.0.0` is the `latest` tag in Verdaccio and public npm.
- The same CI-produced tarball was published to both registries. npm SHA-1:
  `192fd05ea69417fda7223c3f2b9bed83b3b96d0a`. SHA-512:
  `ccef38a8e1b3f36688a6dd448691bc850aefe8a9e74e902ed90b5ec918f94863b09b53c4b90cdb31d50b21018f805cacf22076a9da5a0839649f9114ea81e35e`.
- The tarball downloaded from public npm is byte-identical to the retained
  release artifact. Its registry integrity is
  `sha512-zO84qOGz82aIpt1EhpG8hQrv6KnnTpAu2QteyRj5SGOwm1PEuQzbMdULIQGPgFys8iB2qdpaCDlkn5EU6oHjXg==`.
- Direct and aliased installs from both registries passed in CommonJS and ESM.
  Public npm also reported zero production vulnerabilities and one verified
  registry signature.
- The retained release directory contains the tarball, `SHA512SUMS`, and a
  CycloneDX 1.5 SBOM.
- GitHub Actions run `31926166384` passed Linux, macOS, Windows, Node.js
  14.17 through 24, TypeScript 3.9 through 7.0, Deno, Bun, package, audit,
  artifact, checksum, and SBOM jobs. CodeQL run `31926166222` passed.
- A final `npm pack --dry-run` exposed inherited npm dry-run configuration
  in nested package smoke tests. Child npm processes now clear that inherited
  flag, and CI runs the exact dry-run command as a release regression check.
  The corrected source still produces the exact published tarball hashes.
- Production documentation returned HTTP 200 for HTML, JavaScript, CSS,
  image, package metadata, sitemap, robots, and LLM reference files.
  Chromium validated desktop and 390 px mobile rendering with no console
  errors or horizontal overflow. The production playground filtered a
  prototype-pollution payload in skip mode and returned `UnsafeKeyError` in
  strict mode without changing `Object.prototype`.
- Release tag: `v1.0.0`. GitHub release assets are the exact published
  tarball, its SHA-512 checksum file, and the CycloneDX SBOM.

## 2026-10-13 - 1.1.0 exact compatibility and upstream improvements

Review findings on 1.0.4:

- A repeated input reference could receive another branch's merged result:
  the clone memo stored merge results under the target and source objects.
- Keys replaced by the source moved to the end of the result, changing
  `JSON.stringify` output.
- Repeated non-cyclic references were shared in the result.
- `null` options, falsy hooks, more than 100,000 keys, more than 1,000 levels,
  and `constructor` or `prototype` data diverged from deepmerge 4.
- ESM declarations did not type `merge.all` on the default export.
- The old differential test compared with `deepEqual`, so it could not see key
  order, prototypes, or aliasing.

Decisions:

- Defaults match deepmerge 4.3.1; hardening moved to `unsafeKeys`,
  `onUnsafeKey`, `maxDepth`, `maxKeys`, and the `strict` preset. Setting
  `onUnsafeKey` selects the strict key policy so 1.0 configurations keep their
  behavior.
- Cycle detection short-circuits only exact repeats of an in-progress merge or
  clone, so every terminating deepmerge 4 input keeps the same recursion.
- Released as a minor version: nothing that worked stops working, and the
  changed outputs are compatibility fixes. The CHANGELOG lists each change.
- Upstream review covered 143 issues, 137 pull requests, the `v5`,
  `null-objects`, and `prototype-polution-m342x` branches, and all 227 forks.
  `deepmerge@4.3.1`, still the latest upstream release, is affected by
  CVE-2026-93753 (deepmerge#273); 1.0.4 and 1.1.0 are not.
- Added `createDeepmerge`, `strict`, `isPlainMergeableObject`,
  `skipUndefined`, `mergeCollections`, `customMergeScope`, the `customMerge`
  context argument, and the `overwriteArrays`, `mergeArraysByIndex`,
  `concatUniqueArrays`, and `mergeArraysByKey` strategies.
- The browser bundle budget rose from 10 KB to 12 KB minified for these
  features.

Validation:

- The exact differential suite compares complete output graphs (values with
  `Object.is`, own-key order, descriptors, prototypes, aliasing, input
  identity, thrown error types, and input immutability) with deepmerge 4.3.1
  across ten option variants and `merge.all`. 45,000 cases over three seeds
  (900,000 comparisons) found no difference. The harness was checked against
  the 1.0.4 source, where it reports the known divergences.
- deepmerge's own 4.3.1 suite (115 tape assertions) and its README examples
  pass against the 1.1.0 CommonJS build (`npm run test:upstream`, also in CI).
- Every published CVE-2026-93753 variant is vulnerable in deepmerge 4.3.1 and
  safe in 1.0.4 and 1.1.0.
- Maximum nesting before a stack overflow on Node.js 24.20: deepmerge 4.3.1
  about 1,450 objects or 1,350 arrays; 1.1.0 about 1,520 objects or 1,850
  arrays.
- Benchmark on Node.js 24.20: 1.0.4 measured 86,405 ops/s against 143,443 for
  deepmerge 4.3.1; 1.1.0 measured about 200,000 against about 150,000.
- TypeScript 3.9.10, 4.7.4, 4.9.5, 5.9.3, 6.0.3, and 7.0.2 compile consumer
  code that uses both the upstream declaration patterns and the new API.

Release status:

- Source commit `d87de3d06ef427d45e5e45fa13f61dc677d27c55`, annotated tag
  `v1.1.0`. CI run `38433103190` passed on that commit: tests and coverage,
  the upstream deepmerge suite, TypeScript 3.9 through 7.0, Node.js 14.17
  through 24 on Linux plus Node.js 20 on Windows and macOS, Deno, Bun, and the
  reproducible package job. CodeQL run `38433103181` ran on the same commit.
- The CI package artifact, the local release build, and the publish workflow
  artifact are byte-identical. SHA-512:
  `6c44351295eb96ef4f4d380a0fdcfce4c5981a30ccbfbf5f176aa7d8b61d9ae929ba3ea89e49f991995102ed0f699bd4bfd6507abc2d0d5808127d8b62db04ef`.
  npm integrity:
  `sha512-bEQ1EpXrlu9PTTgKD9z85MWYGjDMv79fF2qn2LYdmukpuj6onkn5kZlRAu0PaZvUv9ZQerwtDVgIEn2LYtsE7w==`.
- The same tarball was published to Verdaccio first, then to public npm by
  publish run `38433471277` (workflow dispatch by the owner's account) with
  SLSA provenance. `1.1.0` is `latest`; the registry tarball is
  byte-identical to the reviewed artifact and the registry README is the
  1.1.0 README.
- Clean installs from Verdaccio and public npm passed direct CommonJS and
  ESM, the `deepmerge` npm alias, and TypeScript 5.9 `Node16` resolution of
  `merge.all` on the default import. `npm audit signatures` verified the
  installed package.
- The retained release directory
  `/storage/data/releases/stackline-deepmerge/1.1.0` contains the tarball,
  `SHA512SUMS`, and the CI CycloneDX SBOM. The GitHub release `v1.1.0` carries
  the same three assets.
- Package documentation was deployed on 2026-10-13 from commit
  `dc7c9ed1`, which versions the asset URLs (`?v=1.1.0`) so browsers never
  combine the new page with cached 1.0 scripts. The production route
  `/var/www/html/alexandro.net_docs/vanilla/deepmerge/` holds 23 files that
  match the reviewed staging SHA-256 manifest. The previous route and the docs
  aggregate sitemap are recoverable at
  `/var/backups/stackline-docs/20261013T171417Z-deepmerge-1.1.0`.
- The docs aggregate sitemap went from 3,330 to 3,332 URLs: the two new guide
  routes were added and the three existing deepmerge routes moved to
  `lastmod` 2026-10-13, through `stackline-open-source/scripts/upsert-sitemap.php`
  with only the five deepmerge package entries. Ownership `www-data:www-data
  644` was preserved. The root sitemap and the catalog guide were not changed.
- The portfolio documentation overlay (present on 134 package routes) was kept
  and refreshed for 1.1.0: the "Current package documentation" banner,
  `readme.html`, `README.md`, `documentation-release.json`, and the publication
  fields in `package-meta.json`. `readme.html` reuses the production template;
  its article is the README rendered with `marked` 18.1.1 after removing
  `language-*` code classes and table `align` attributes, which reproduces the
  1.0.4 page byte for byte from the 1.0.4 README. Future releases must refresh
  this overlay rather than drop it.
- Public HTTPS returned 200 with the expected content types and byte-identical
  bodies for all 23 files; DNS resolves directly to the origin. Chromium at
  1,440 and 390 CSS pixels found no console errors, failed requests, or
  horizontal overflow on the package page or `readme.html`.
- The catalog guide `https://alexandro.net/guides/deepmerge-security/` and the
  catalog download snapshot are updated in `stackline-open-source` but not yet
  deployed.
