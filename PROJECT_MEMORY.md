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
- Treat `__proto__`, `prototype`, and `constructor` as unsafe at every depth.
- Do not publish a release until tests, package validation, clean-install
  smoke tests, and GitHub CI pass.
- Publish the same validated tarball to Verdaccio and public npm.
- Keep TypeScript 3.9 compatibility throughout the 1.x line unless a future
  major explicitly changes the contract.

## 2026-08-15 to 2026-08-16 - Project creation and 1.0.0 release preparation

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

- Package name was unclaimed on public npm when checked.
- Repository name was unclaimed under `alexandroit` when checked.
- Verdaccio and public npm publisher credentials were confirmed without
  exposing credentials in the repository.
- Publication and final post-publication validation are still pending at this
  memory checkpoint.
