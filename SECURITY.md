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
