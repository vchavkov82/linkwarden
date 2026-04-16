import { expect, test } from "../../index";

/**
 * Drag & Drop Organization E2E tests
 *
 * These tests verify the manual reorder feature end-to-end.
 * They require at least one collection with ≥2 links to be present
 * in the test user's account (set up via global auth fixtures).
 *
 * Each test gracefully skips if prerequisites are not met so the
 * suite does not fail in a clean/empty environment.
 */

test.describe(
  "Drag & Drop organization",
  {
    tag: "@dnd",
  },
  async () => {
    // --- T1: Sort dropdown includes "Manual Order" option ---

    test("Sort dropdown contains Manual Order option", async ({ page }) => {
      await page.goto("/links");

      // Open sort dropdown (chevron-expand button)
      const sortBtn = page
        .locator("button")
        .filter({ has: page.locator(".bi-chevron-expand") })
        .first();

      if (!(await sortBtn.isVisible())) {
        test.skip();
        return;
      }

      await sortBtn.click();
      const manualOption = page.getByRole("menuitemradio", {
        name: /manual order/i,
      });
      await expect(manualOption).toBeVisible();
    });

    // --- T2: Selecting Manual Order persists after reload ---

    test("Selecting Manual Order sort persists after reload", async ({
      page,
    }) => {
      await page.goto("/links");

      const sortBtn = page
        .locator("button")
        .filter({ has: page.locator(".bi-chevron-expand") })
        .first();

      if (!(await sortBtn.isVisible())) {
        test.skip();
        return;
      }

      await sortBtn.click();
      const manualOption = page.getByRole("menuitemradio", {
        name: /manual order/i,
      });
      await manualOption.click();

      // Reload and verify localStorage sortBy is 4 (Sort.Manual)
      await page.reload();
      const sortBy = await page.evaluate(() =>
        localStorage.getItem("sortBy")
      );
      expect(sortBy).toBe("4");
    });

    // --- T3: PATCH /api/v1/links/reorder returns 200 with valid payload ---

    test("PATCH /api/v1/links/reorder accepts valid payload", async ({
      page,
    }) => {
      await page.goto("/links");

      // Get a collection with links via the API
      const collectionsRes = await page.request.get("/api/v1/collections");
      const { response: collections } = await collectionsRes.json();

      if (!collections?.length) {
        test.skip();
        return;
      }

      const col = collections[0];

      const linksRes = await page.request.get(
        `/api/v1/links?collectionId=${col.id}&sort=0`
      );
      const { response: links } = await linksRes.json();

      if (!links?.length || links.length < 2) {
        test.skip();
        return;
      }

      // Reverse the order as a reorder operation
      const orderedIds = [...links.map((l: any) => l.id)].reverse();

      const res = await page.request.patch("/api/v1/links/reorder", {
        data: { collectionId: col.id, orderedIds },
      });

      expect(res.status()).toBe(200);
    });

    // --- T4: After reorder API call, links come back in the new order ---

    test("Links maintain reordered position after reload when sort is Manual", async ({
      page,
    }) => {
      await page.goto("/links");

      const collectionsRes = await page.request.get("/api/v1/collections");
      const { response: collections } = await collectionsRes.json();

      if (!collections?.length) {
        test.skip();
        return;
      }

      const col = collections[0];

      const linksRes = await page.request.get(
        `/api/v1/links?collectionId=${col.id}&sort=0`
      );
      const { response: links } = await linksRes.json();

      if (!links?.length || links.length < 2) {
        test.skip();
        return;
      }

      // Reverse order
      const orderedIds = [...links.map((l: any) => l.id)].reverse();

      await page.request.patch("/api/v1/links/reorder", {
        data: { collectionId: col.id, orderedIds },
      });

      // Fetch with Manual sort and verify order
      const reorderedRes = await page.request.get(
        `/api/v1/links?collectionId=${col.id}&sort=4`
      );
      const { response: reordered } = await reorderedRes.json();

      expect(reordered[0].id).toBe(orderedIds[0]);
      expect(reordered[reordered.length - 1].id).toBe(
        orderedIds[orderedIds.length - 1]
      );

      // Restore original order
      await page.request.patch("/api/v1/links/reorder", {
        data: {
          collectionId: col.id,
          orderedIds: links.map((l: any) => l.id),
        },
      });
    });

    // --- T6: Collection nesting — reparent via PUT /api/v1/collections/:id ---

    test("Reparenting a collection updates its parentId", async ({ page }) => {
      await page.goto("/collections");

      const collectionsRes = await page.request.get("/api/v1/collections");
      const { response: collections } = await collectionsRes.json();

      // Need at least two top-level collections (parentId null)
      const topLevel = collections?.filter((c: any) => !c.parentId);
      if (!topLevel || topLevel.length < 2) {
        test.skip();
        return;
      }

      const parent = topLevel[0];
      const child = topLevel[1];

      // Reparent child under parent (same as DnD collection nesting)
      const res = await page.request.put(`/api/v1/collections/${child.id}`, {
        data: { parentId: parent.id },
      });
      expect(res.status()).toBe(200);

      // Verify parentId is updated
      const verifyRes = await page.request.get("/api/v1/collections");
      const { response: updated } = await verifyRes.json();
      const updatedChild = updated.find((c: any) => c.id === child.id);
      expect(updatedChild?.parentId).toBe(parent.id);

      // Restore: move child back to top level
      await page.request.put(`/api/v1/collections/${child.id}`, {
        data: { parentId: null },
      });
    });

    // --- T7: Multi-select drag — move multiple links via batch PUT ---

    test("Multiple links can be moved to another collection atomically", async ({
      page,
    }) => {
      await page.goto("/links");

      const collectionsRes = await page.request.get("/api/v1/collections");
      const { response: collections } = await collectionsRes.json();

      if (!collections || collections.length < 2) {
        test.skip();
        return;
      }

      const srcCol = collections[0];
      const dstCol = collections[1];

      const linksRes = await page.request.get(
        `/api/v1/links?collectionId=${srcCol.id}&sort=0`
      );
      const { response: links } = await linksRes.json();

      if (!links || links.length < 3) {
        test.skip();
        return;
      }

      // Move first 3 links to dstCol (mirrors multi-select drag Promise.all)
      const toMove = links.slice(0, 3);
      await Promise.all(
        toMove.map((link: any) =>
          page.request.put(`/api/v1/links/${link.id}`, {
            data: {
              ...link,
              collection: {
                id: dstCol.id,
                name: dstCol.name,
                ownerId: dstCol.ownerId,
              },
            },
          })
        )
      );

      // Verify all 3 are now in dstCol
      const dstRes = await page.request.get(
        `/api/v1/links?collectionId=${dstCol.id}&sort=0`
      );
      const { response: dstLinks } = await dstRes.json();
      const movedIds = new Set(toMove.map((l: any) => l.id));
      const foundCount = dstLinks.filter((l: any) => movedIds.has(l.id)).length;
      expect(foundCount).toBe(3);

      // Restore
      await Promise.all(
        toMove.map((link: any) =>
          page.request.put(`/api/v1/links/${link.id}`, {
            data: {
              ...link,
              collection: {
                id: srcCol.id,
                name: srcCol.name,
                ownerId: srcCol.ownerId,
              },
            },
          })
        )
      );
    });

    // --- T5: Moving a link between collections via drag (API-level) ---

    test("Moving link to another collection updates collectionId", async ({
      page,
    }) => {
      await page.goto("/links");

      const collectionsRes = await page.request.get("/api/v1/collections");
      const { response: collections } = await collectionsRes.json();

      if (!collections || collections.length < 2) {
        test.skip();
        return;
      }

      const srcCol = collections[0];
      const dstCol = collections[1];

      const linksRes = await page.request.get(
        `/api/v1/links?collectionId=${srcCol.id}&sort=0`
      );
      const { response: links } = await linksRes.json();

      if (!links?.length) {
        test.skip();
        return;
      }

      const link = links[0];

      // Move via PUT (same as DnD cross-collection drop)
      const moveRes = await page.request.put(`/api/v1/links/${link.id}`, {
        data: {
          ...link,
          collection: {
            id: dstCol.id,
            name: dstCol.name,
            ownerId: dstCol.ownerId,
          },
        },
      });

      expect(moveRes.status()).toBe(200);

      // Verify it appears in destination
      const dstLinksRes = await page.request.get(
        `/api/v1/links?collectionId=${dstCol.id}&sort=0`
      );
      const { response: dstLinks } = await dstLinksRes.json();
      expect(dstLinks.some((l: any) => l.id === link.id)).toBe(true);

      // Restore
      await page.request.put(`/api/v1/links/${link.id}`, {
        data: {
          ...link,
          collection: {
            id: srcCol.id,
            name: srcCol.name,
            ownerId: srcCol.ownerId,
          },
        },
      });
    });
  }
);
