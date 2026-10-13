# Benchmark Methodology

The checked-in benchmark compares `@stackline/deepmerge` with
`deepmerge@4.3.1` in the same Node.js process and with the same nested
configuration objects.

```bash
npm ci
npm run benchmark
```

Set `BENCHMARK_ITERATIONS` to control the sample size:

```bash
BENCHMARK_ITERATIONS=500000 npm run benchmark
```

The benchmark warms both implementations before measurement and reports
operations per second. It is a regression tool, not a universal performance
claim. CPU, Node.js version, object shape, callbacks, and enabled options
materially affect results.

## Recorded results

| Release | Node.js | `@stackline/deepmerge` | `deepmerge@4.3.1` |
| :--- | :--- | ---: | ---: |
| 1.0.4 | 24.20.0 | 86,405 ops/s | 143,443 ops/s |
| 1.1.0 | 24.20.0 | about 200,000 ops/s | about 150,000 ops/s |

Release 1.1.0 removed the per-node weak-map memoization, the per-object key
set, and per-key path allocation, and writes most keys by assignment.

Compatibility and security take priority over winning a synthetic throughput
number. Report the complete command, Node.js version, CPU, and raw output when
sharing results.
