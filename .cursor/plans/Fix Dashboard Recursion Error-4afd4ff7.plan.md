<!-- 4afd4ff7-3c58-4391-a559-ff21499313aa -->
---
todos:
  - id: "remove-debug-log"
    content: "Remove debug console.log and duplicate useDndContext() from TagListing.tsx"
    status: pending
  - id: "fix-dashboard-links"
    content: "Remove unused useLinks() hook and fix useEffect dependencies in DashboardLinks.tsx Card component"
    status: pending
  - id: "fix-collection-order"
    content: "Fix the collection order comparison bug in CollectionListing.tsx useEffect"
    status: pending
  - id: "test-build"
    content: "Build and test the production image to verify the fix"
    status: pending
isProject: false
---
# Fix Dashboard Recursion Error

## Root Cause Analysis

The "too much recursion" error is caused by a combination of issues:

1. **Debug code in production** - `TagListing.tsx` has console.log statements and duplicate `useDndContext()` calls
2. **Inefficient hook usage** - `DashboardLinks.tsx` Card component unnecessarily calls `useLinks()` for each card
3. **CollectionListing useEffect bug** - A logic error that could trigger unnecessary updates

## Changes Required

### 1. Remove debug code from `apps/web/components/TagListing.tsx`

```17:18:apps/web/components/TagListing.tsx
  const ctx = useDndContext();
  console.log("DndContext active?", ctx.active);
```

Remove lines 17-18. The `useDndContext()` is already called on line 14.

### 2. Remove unnecessary hook call from `apps/web/components/DashboardLinks.tsx`

```85:85:apps/web/components/DashboardLinks.tsx
  const { links } = useLinks();
```

Remove line 85 - this unnecessarily fetches ALL links for every Card component and isn't used effectively. The link data is already passed via props.

Also update the useEffect dependency:

```99:105:apps/web/components/DashboardLinks.tsx
  useEffect(() => {
    setCollection(
      collections.find(
        (e) => e.id === link.collection.id
      ) as CollectionIncludingMembersAndLinkCount
    );
  }, [collections, links]);
```

Change `[collections, links]` to just `[collections, link.collection.id]`.

### 3. Fix bug in `apps/web/components/CollectionListing.tsx`

```94:102:apps/web/components/CollectionListing.tsx
        if (
          JSON.stringify(newCollectionOrder) !==
          JSON.stringify(user.collectionOrder)
        ) {
          updateUser.mutateAsync({
            ...user,
            collectionOrder: newCollectionOrder,
          });
        }
```

The comparison uses `newCollectionOrder` (which is just a copy of `user.collectionOrder`) instead of `filteredCollectionOrder` (which has the actual changes). This is a bug that could cause issues though it currently prevents the mutation from running incorrectly.

Fix by comparing and sending `filteredCollectionOrder`:

```typescript
if (
  JSON.stringify(filteredCollectionOrder) !==
  JSON.stringify(user.collectionOrder)
) {
  updateUser.mutateAsync({
    ...user,
    collectionOrder: filteredCollectionOrder,
  });
}
```

## Testing

After making changes:
1. Build the production image: `yarn web:build`
2. Run locally and navigate to `/dashboard`
3. Verify no recursion errors in console
4. Verify drag-and-drop still works on sidebar collections and tags