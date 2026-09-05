# Contributing

Keep the plugin small and native to DSH. New behavior should use documented Harness extension points, avoid external services by default, and preserve the fast path for precise reversible tasks.

Before opening a pull request:

```sh
npm install
npm test
npm pack --dry-run
```

For changes to interview guidance, add or update a scenario in both evaluation documents. Report model-quality results only with the exact model, DSH version, run count, baseline, full rubric, and retained transcripts.
