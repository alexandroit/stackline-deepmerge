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

## Security contract

The default merge path:

- rejects `__proto__`, `prototype`, and `constructor` at every object depth;
- checks both target and source keys;
- does not read values behind rejected unsafe keys;
- copies only own enumerable string and symbol keys;
- writes accepted keys as data properties;
- bounds depth and enumerable key traversal;
- tracks circular and shared references.

Use `{ onUnsafeKey: 'throw' }` when an unsafe key must reject the entire
operation instead of being filtered.

## Trust boundary

Options and callbacks are executable application code. Do not accept
`arrayMerge`, `customMerge`, or `isMergeableObject` functions from untrusted
input. Safe property getters may execute when their values are merged, just as
normal JavaScript property access does. Convert hostile wire formats with a
trusted parser and use strict input limits at exposed boundaries.
