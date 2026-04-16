# Spec: Browser-Scoped Bookmark Sync (Firefox + Edge)

**Status:** Draft — awaiting approval  
**Date:** 2026-04-16  
**Target users:** End users running the Linkwarden extension in Firefox and Edge simultaneously

---

## 1. Problem

A single Linkwarden extension is installed in both Firefox and Edge, both connected to the same server account. This causes two critical bugs:

**Bug 1 — Cross-browser deletions** (`syncEngine.ts` lines 432–459):  
`pushToServer` deletes any server link whose browser bookmark ID is missing from the local cache. Firefox doesn't know about Edge's browser bookmark IDs → Firefox deletes Edge's server links every sync. Edge recreates them → Firefox deletes again. Infinite conflict loop.

**Bug 2 — Duplicates** (`syncEngine.ts` lines 261–286 / `folderMapper.ts` lines 246–275):  
Both browsers see server links they don't have a local cache entry for and both try to create browser bookmarks for them. `reconcileFolderMap` also creates browser folders for ALL server collections (including the other browser's), polluting each browser's bookmark tree.

---

## 2. Solution

**Browser-scoped collections.** Each extension instance owns a dedicated root collection named after its browser (`Firefox` or `Edge`). All sync operations are scoped to that root subtree. The two engines never read or write each other's data.

### Collection structure (server)

```
Firefox          (top-level, parentId: null)
  └─ Work
  └─ Personal

Edge             (top-level, parentId: null)
  └─ Work
  └─ Personal
```

### Folder structure (browser)

```
Firefox browser:            Edge browser:
Other Bookmarks/            Other Bookmarks/
  Firefox/                    Edge/
    Work/                       Work/
    Personal/                   Personal/
```

Bookmarks placed directly in `Firefox/` (not in a sub-folder) sync to the `Firefox` root collection. Cross-browser contamination is structurally impossible.

---

## 3. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | Add bookmark in Firefox → appears only in `Firefox/` collection on server; Edge unaffected |
| AC2 | Delete bookmark in Firefox → removed from `Firefox/` on server only; Edge bookmarks unchanged |
| AC3 | Add bookmark in Edge → appears only in `Edge/` collection; Firefox unaffected |
| AC4 | Both browsers sync simultaneously → no duplicates, no deletions from the other browser |
| AC5 | Options page shows detected browser name ("Firefox" or "Edge") as read-only field |
| AC6 | Extension builds and installs cleanly in Firefox 121+ and Edge 121+ |
| AC7 | First sync is idempotent — running it twice creates no duplicate collections or bookmarks |

---

## 4. Changes Required

**Extension only** (`apps/browser-extension/`). No server-side changes.

### 4.1 Auto-detect browser type

New `detectBrowserType()` utility in `src/@/lib/utils.ts`:
- Returns `'firefox'` if `navigator.userAgent` contains `Firefox/`
- Returns `'edge'` if `navigator.userAgent` contains `Edg/`
- Returns `'chrome'` otherwise

### 4.2 Config schema extension (`src/@/lib/config.ts`)

Add three fields:
```ts
browserType: 'firefox' | 'edge' | 'chrome'  // auto-detected at runtime
rootCollectionId: number | null              // server ID of the browser's root collection
rootFolderId: string | null                  // browser folder ID of the sync root folder
```

### 4.3 Root collection bootstrap (`src/@/lib/sync/folderMapper.ts`)

New `ensureRootCollection(baseUrl, apiKey, browserType)`:
1. Find or create server collection `"Firefox"` / `"Edge"` at top level
2. Find or create browser folder `"Firefox"` / `"Edge"` under Other Bookmarks
3. Persist both IDs to config
4. Idempotent — safe to call on every sync

### 4.4 Scoped `reconcileFolderMap`

New signature: `reconcileFolderMap(baseUrl, apiKey, rootCollectionId, rootFolderId)`

- Only processes browser folders that are descendants of `rootFolderId`
- Only creates/matches server collections that are descendants of `rootCollectionId`
- Never touches the other browser's folders or collections

### 4.5 Scoped `pullFromServer`

New parameter: `managedCollectionIds: Set<number>`

- Skip any server link whose `collectionId` is not in `managedCollectionIds`
- Skip tombstones for entries outside `managedCollectionIds`

### 4.6 Scoped `pushToServer`

New parameters: `managedCollectionIds: Set<number>`, `rootFolderId: string`

- Collect bookmarks only from `rootFolderId` subtree (not all browser bookmarks)
- In the delete loop: skip entries whose `collectionId` is not in `managedCollectionIds`

### 4.7 Options page update (`src/@/components/OptionsForm.tsx`)

- Show read-only "Browser: Firefox / Edge" field (auto-detected)
- Add "Reset sync scope" button (clears root IDs from storage, forces re-bootstrap)

---

## 5. Non-Goals

- No shared cross-browser collection
- No server-side schema changes
- No cross-browser bookmark mirroring (browsers remain independent)
- No Chromium/Chrome changes (same code handles it automatically)

---

## 6. Tech Stack Constraints

| Concern | Constraint |
|---|---|
| Extension build | Vite, single codebase, MV3 manifest |
| Browser API | `chrome.*` with `@types/firefox-webext-browser` polyfill |
| Storage | `chrome.storage.local` (per-browser-instance, no sharing) |
| Server API | No changes — uses existing `/api/v1/collections`, `/api/v1/sync/links`, `/api/v1/links` |
| Sync model | Pull-based; no webhooks needed |
