# Todo: Browser-Scoped Sync (Firefox + Edge)

## Phase 1 — Foundation

- [ ] T1: Add `detectBrowserType()` to `src/@/lib/utils.ts` — returns 'firefox'/'edge'/'chrome' from user agent
- [ ] T2: Extend config type in `src/@/lib/config.ts` — add `browserType`, `rootCollectionId`, `rootFolderId`

## Phase 2 — Root Collection Bootstrap

- [ ] T3: Add `ensureRootCollection(baseUrl, apiKey, browserType)` to `folderMapper.ts` — find or create root collection + browser folder; idempotent

## Phase 3 — Scoped Sync

- [ ] T4: Scope `reconcileFolderMap` to root subtree (new `rootCollectionId` + `rootFolderId` params)
- [ ] T5: Add `getManagedCollectionIds(map, rootCollectionId): Set<number>` to `folderMapper.ts`
- [ ] T6: Scope `pullFromServer` — skip links/tombstones outside `managedCollectionIds`
- [ ] T7: Scope `pushToServer` — collect only from `rootFolderId` subtree; delete only within `managedCollectionIds`

## Phase 4 — Wire Up

- [ ] T8: Update `performSync` — call `ensureRootCollection`, pass scope into pull/push
- [ ] T9: Update `OptionsForm.tsx` — show browser type; add "Reset sync scope" button

## Checkpoint

- [ ] Build: `npm run build` — zero TypeScript errors
- [ ] AC1–AC7: Install in Firefox + Edge, verify no cross-browser contamination, no duplicates, no wrong deletions
