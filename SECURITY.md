# Security Policy

## Supported versions

| Version | Security updates |
| :--- | :---: |
| `1.x` | Yes |
| `< 1.0.0` | No public releases |

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use the repository's
[private security advisory form](https://github.com/alexandroit/stackline-deepmerge/security/advisories/new).

Include:

- the affected version;
- a minimal reproducer or malicious input;
- the observed impact;
- the runtime and module system;
- any proposed mitigation.

We aim to acknowledge complete reports within three business days. Confirmed
issues are fixed privately, covered by regression tests, and disclosed after a
patched release is available.

## Upstream advisories

[CVE-2026-93753](https://www.cve.org/CVERecord?id=CVE-2026-93753) affects
`deepmerge` `>= 4.2.0, <= 4.3.1`: a `__proto__` key merged into a
null-prototype object, a `null` or primitive placeholder, or a target with its
own `__proto__` key replaces the prototype of the merged result. No release of
`@stackline/deepmerge` is affected. The regression suite runs every published
attack variant against both packages.

## Development test baseline

The development-only `deepmerge@4.3.1` dependency is deliberately vulnerable.
The differential and security tests use it as an oracle and prove that each
CVE-2026-93753 payload affects the upstream result but not this package.
It is not a runtime dependency or part of the published code. Run these tests
only with reviewed repository fixtures, never with external configuration.
`npm run audit:raw` continues to report one real LOW advisory and exits with
failure. The release gate uses a narrowly reviewed fixture exception expiring
on **2026-12-04**; this is not a claim of zero development vulnerabilities.
Consumer installations have no runtime dependencies.

`npm run audit:dependencies` accepts only GHSA-gcqx-w48m-w2h4 with its reviewed
LOW severity and affected range. It requires the exact `deepmerge@4.3.1`
registry URL and SHA-512 integrity, a development-only lockfile node referenced
only by the root development manifest, and zero production findings. No alias
may replace the upstream oracle. Any extra advisory, dependent, path, changed
fixture, or expired exception fails the gate.

The build records inputs and SHA-256 digests for every CJS, ESM, and browser
bundle. The gate verifies those digests, allows only this package's source
inputs with no external imports, and checks that packing excludes fixtures,
tests, dependencies, and build tooling. Source and all three built runtime
formats must reject the prototype-poisoning cases that still succeed against
the upstream fixture. Negative policy tests and registry signature checks are
part of the same gate. Review the exception again before its expiry or any
change to the oracle, advisory, dependency graph, or build boundaries.

## Security contract

The default merge path:

- drops `__proto__` from targets and sources at every depth;
- skips a source key that exists on the target only through its prototype
  chain or as a non-enumerable property, like deepmerge 4;
- does not read values behind rejected keys;
- copies only own enumerable string and symbol keys;
- writes accepted keys as own data properties, never through setters;
- never mutates its inputs or the options object;
- reproduces circular references instead of overflowing the stack.

The `strict` export, or the matching options, also:

- drops `constructor` and `prototype` at every depth (`unsafeKeys: 'strict'`);
- rejects the whole operation on any of those keys
  (`onUnsafeKey: 'throw'`);
- bounds depth and key traversal (`maxDepth`, `maxKeys`).

Use the strict mode at boundaries that merge untrusted input.

## Trust boundary

Options and callbacks are executable application code. Do not accept
`arrayMerge`, `customMerge`, or `isMergeableObject` functions from untrusted
input. Safe property getters may execute when their values are merged, just as
normal JavaScript property access does. Convert hostile wire formats with a
trusted parser and use strict input limits at exposed boundaries.
