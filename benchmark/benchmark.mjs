import { performance } from 'node:perf_hooks';

import legacyMerge from 'deepmerge';
import merge from '../dist/index.js';

const target = {
  app: {
    features: { audit: true, cache: true },
    headers: { accept: 'application/json' },
    plugins: [{ name: 'core', options: { retries: 2 } }]
  },
  regions: ['ca-central-1']
};
const source = {
  app: {
    features: { tracing: true },
    headers: { authorization: 'Bearer redacted' },
    plugins: [{ name: 'metrics', options: { interval: 30 } }]
  },
  regions: ['us-east-1']
};

for (const candidate of [legacyMerge, merge]) {
  for (let index = 0; index < 10000; index += 1) candidate(target, source);
}

const iterations = Number(process.env.BENCHMARK_ITERATIONS || 200000);
const results = [
  run('deepmerge@4.3.1', legacyMerge, iterations),
  run('@stackline/deepmerge', merge, iterations)
].sort((left, right) => right.operationsPerSecond - left.operationsPerSecond);

console.table(results);

function run(name, candidate, count) {
  const startedAt = performance.now();
  for (let index = 0; index < count; index += 1) candidate(target, source);
  const elapsedMs = performance.now() - startedAt;
  return {
    name,
    iterations: count,
    elapsedMs: Math.round(elapsedMs),
    operationsPerSecond: Math.round((count / elapsedMs) * 1000)
  };
}
