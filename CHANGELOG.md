# Changelog

All notable changes are documented here. This project follows Semantic
Versioning.

## [1.0.1] - 2026-08-21

### Added

- Executable adoption examples for hostile configuration input, custom array
  strategies, cycles, and shared references.
- Direct-install and npm-alias migration guide.
- Reproducible benchmark methodology and public Stackline catalog link.
- First-party documentation analytics that never records playground input.
- Trusted-publishing workflow for provenance-enabled future releases.

### Changed

- Package tarballs now include the public guides and executable examples.
- CI resolves release tarballs dynamically instead of hardcoding a version.

No runtime API or declaration behavior changed in this release.

## [1.0.0] - 2026-08-16

### Added

- Immutable deep object and array merge with zero runtime dependencies.
- Default API compatibility with `deepmerge` v4, including `all`,
  `arrayMerge`, `customMerge`, `clone`, and `isMergeableObject`.
- Prototype-pollution protection for `__proto__`, `prototype`, and
  `constructor` in target and source objects at every depth.
- Optional strict unsafe-key rejection through `onUnsafeKey: 'throw'`.
- Circular and shared-reference preservation.
- Configurable `maxDepth` and `maxKeys` traversal limits.
- ESM, callable CommonJS, browser-global, and source-map distributions.
- TypeScript declarations tested from 3.9 through 7.0.
- Differential compatibility tests against `deepmerge@4.3.1`.
- Public documentation, security policy, CI matrix, and live playground.

[1.0.0]: https://github.com/alexandroit/stackline-deepmerge/releases/tag/v1.0.0
[1.0.1]: https://github.com/alexandroit/stackline-deepmerge/compare/v1.0.0...v1.0.1
