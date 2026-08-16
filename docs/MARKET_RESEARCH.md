# Market Research

Research date: 2026-08-15

## Decision

Build `@stackline/deepmerge`: a secure, zero-dependency, modern-package
replacement for the established `deepmerge` API.

The goal is not to predict one million monthly downloads. No package can
guarantee adoption. The goal is to enter a proven, extremely high-volume
category with a low-friction migration and clear unmet maintenance needs.

## Demand snapshot

The official npm downloads API reported the following for 2026-07-11 through
2026-08-09:

| Package | Downloads |
| :--- | ---: |
| `lodash.merge` | 493,506,292 |
| `deepmerge` | 353,418,274 |
| `deep-extend` | 180,360,708 |
| `defu` | 143,244,968 |
| `deepmerge-ts` | 64,560,064 |
| `@fastify/deepmerge` | 13,948,869 |
| `ts-deepmerge` | 13,902,566 |
| `merge-deep` | 7,970,115 |

Source: `https://api.npmjs.org/downloads/point/last-month/<package>`.

These values are a dated market snapshot, not implementation constants or
future promises.

## Maintenance gap

At the research snapshot:

- npm reported `deepmerge@4.3.1`, modified 2023-03-16;
- the upstream GitHub repository was last pushed 2023-04-21;
- the repository had 2,816 stars and 59 open issues;
- open requests covered ESM packaging, default-import interop, TypeScript
  inference, and cyclic objects.

Sources:

- [deepmerge on npm](https://www.npmjs.com/package/deepmerge)
- [deepmerge repository](https://github.com/TehShrike/deepmerge)
- [ESM request 194](https://github.com/TehShrike/deepmerge/issues/194)
- [Cycle request 207](https://github.com/TehShrike/deepmerge/issues/207)
- [ESM request 250](https://github.com/TehShrike/deepmerge/issues/250)
- [Default import issue 255](https://github.com/TehShrike/deepmerge/issues/255)
- [Type inference issue 271](https://github.com/TehShrike/deepmerge/issues/271)

## Security need

Merge utilities repeatedly appear in prototype-pollution advisories because
they recursively turn attacker-controlled property names into object writes.
Modern exploit research also shows that read-side gadgets can make inherited
pollution dangerous even when a specific merge implementation does not write
directly to `Object.prototype`.

References:

- [GitHub Security Lab merge-deep advisory](https://securitylab.github.com/advisories/GHSL-2020-160-merge-deep/)
- [GHSA-9wv6-86v2-598j](https://github.com/advisories/GHSA-9wv6-86v2-598j)
- [GHSA-wf5p-g6vw-rhxx](https://github.com/advisories/GHSA-wf5p-g6vw-rhxx)

## Product thesis

Adoption depends on reducing migration cost:

1. Preserve the callable default export and documented extension hooks.
2. Support an npm alias so existing `import merge from 'deepmerge'` calls do
   not change.
3. Ship both modern and legacy module shapes with accurate types.
4. Remove runtime supply-chain exposure by using zero dependencies.
5. Make unsafe-key behavior and resource limits visible and testable.
6. Provide a browser playground that demonstrates actual merge behavior.

## Alternatives considered

### General utility collection

Rejected because it increases API surface and supply-chain responsibility
without a sharper migration story.

### Fork the existing implementation

Rejected for this package. An independent implementation can adopt modern
architecture and security invariants while behavioral differential tests
protect compatibility.

### Type-only deep merge

Rejected because the largest need is runtime behavior at trust boundaries.

### New incompatible API

Rejected for 1.0. A new API would discard the strongest distribution path:
drop-in migration from an established package.

## Success measures

- clean direct and alias installs;
- no runtime dependencies;
- no known package export or type-resolution defects;
- compatibility reports from real consumers;
- security reports handled through private disclosure;
- sustained download growth without weakening the contract.
