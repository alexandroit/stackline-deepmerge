# Contributing

Thank you for improving `@stackline/deepmerge`.

## Development

Use Node.js 20 or newer for the development toolchain. The published runtime
is separately tested on older supported Node.js versions.

```bash
npm ci
npm test
npm run test:attw
npm run benchmark
```

## Pull requests

Keep each change focused. A pull request should include:

- a clear behavior statement;
- tests for new or changed behavior;
- compatibility impact;
- security impact when object traversal changes;
- documentation for public API changes.

Do not weaken dangerous-key filtering, cycle handling, or resource limits to
gain benchmark throughput.

## Compatibility changes

Without options, results must match `deepmerge@4.3.1` exactly. New behavior
belongs behind an option or export. Before changing merge semantics:

1. add a focused local test;
2. run the exact differential suite, including a large run such as
   `DEEPMERGE_DIFF_CASES=15000 DEEPMERGE_DIFF_SEED=1 node --test test/compatibility.test.mjs`;
3. document any intentional difference in `docs/COMPATIBILITY.md`;
4. record upstream issues the change addresses in `docs/UPSTREAM.md`;
5. validate direct and npm-alias installation shapes.

## Security changes

Security fixes should not be discussed in a public issue before a patched
release exists. Follow [SECURITY.md](SECURITY.md).

## Commits

Use a short imperative subject. Keep generated output and unrelated formatting
out of the same commit.

By contributing, you agree that your contribution is licensed under the MIT
License.
