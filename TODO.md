# Roadmap

## Release 1.x

- [ ] Collect real migration reports from CommonJS, ESM, TypeScript, and
  browser consumers.
- [ ] Add framework smoke projects when a compatibility gap is reported.
- [ ] Track benchmark history across supported Node.js LTS releases.
- [ ] Evaluate an opt-in descriptor-preserving mode without changing default
  compatibility.
- [ ] Evaluate an opt-in array-item limit for exposed parser boundaries.
- [ ] Publish a machine-readable compatibility corpus for other merge
  libraries.

## Maintenance rules

- Never trade dangerous-key filtering for benchmark results.
- Never add a runtime dependency without a documented supply-chain review.
- Never narrow supported TypeScript versions in a patch release.
- Keep npm alias migration tested before every release.
- Record every release and operational decision in `PROJECT_MEMORY.md`.
