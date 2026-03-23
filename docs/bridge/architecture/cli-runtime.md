# CLI Runtime Architecture

The maintained architecture is intentionally small:

- `apps/bridge-cli` owns user command parsing and output formatting.
- `packages/bridge-core` owns pairing, config discovery, QR generation helpers, and service install/status primitives.
- `packages/bridge-runtime` owns the long-running relay/gateway runtime.

## Dependency Direction

```text
apps/bridge-cli   -> packages/bridge-core
apps/bridge-cli   -> packages/bridge-runtime
packages/runtime  -> packages/bridge-core
```

Rules:

1. Keep reusable transport logic in `packages/`.
2. Keep command parsing and terminal output in `apps/`.
3. Do not create package dependencies that point from `packages/` back into `apps/`.
4. Do not add desktop-only compatibility layers. The repository is CLI-only.
