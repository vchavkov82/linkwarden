# Plan: Browser-Scoped Sync

See spec at: `SPEC.md`  
See implementation plan at: `/home/vchavkov/.claude/plans/noble-cooking-fog.md`

## Dependency Order

T1 (detectBrowserType) → T2 (config schema) → T3 (ensureRootCollection)
→ T4 (scope reconcileFolderMap) → T5 (getManagedCollectionIds)
→ T6 (scope pullFromServer) + T7 (scope pushToServer)
→ T8 (wire performSync) → T9 (Options UI)

## Status: Not started
