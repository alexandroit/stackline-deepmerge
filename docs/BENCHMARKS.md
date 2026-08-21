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
claim. CPU, Node.js version, object shape, callbacks, cycle tracking, and
security limits materially affect results.

Compatibility and security take priority over winning a synthetic throughput
number. Report the complete command, Node.js version, CPU, and raw output when
sharing results.
