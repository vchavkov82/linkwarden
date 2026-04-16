import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

let prisma: typeof import("@linkwarden/prisma").prisma;
let importFromHTMLFile: typeof import("./importFromHTMLFile").default;
let removeFolder: typeof import("@linkwarden/filesystem").removeFolder;

const createdUserIds: number[] = [];

const ensureTestEnv = async () => {
  await import("dotenv/config");

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set (e.g. from .env) when RUN_INTEGRATION_TESTS=1 for importFromHTMLFile tests."
    );
  }

  vi.stubEnv("NODE_ENV", "test");
  process.env.STRIPE_SECRET_KEY = "";
  process.env.NEXT_PUBLIC_STRIPE = "false";
  process.env.NEXT_PUBLIC_REQUIRE_CC = "false";
  process.env.MAX_LINKS_PER_USER = process.env.MAX_LINKS_PER_USER || "5";
  process.env.STORAGE_FOLDER = process.env.STORAGE_FOLDER || "data-test";

  delete process.env.SPACES_ENDPOINT;
  delete process.env.SPACES_REGION;
  delete process.env.SPACES_KEY;
  delete process.env.SPACES_SECRET;
};

const createTestUser = async () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      username: `import_test_${suffix}`,
      email: `import_test_${suffix}@example.com`,
    },
  });

  createdUserIds.push(user.id);
  return user;
};

const cleanupUser = async (userId: number) => {
  const collections = await prisma.collection.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    return;
  }

  for (const { id } of collections) {
    await removeFolder({ filePath: `archives/${id}` });
  }
};

describe.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
  "importFromHTMLFile DB integration",
  () => {
    beforeAll(async () => {
      await ensureTestEnv();

      const prismaModule = await import("@linkwarden/prisma");
      prisma = prismaModule.prisma;

      const filesystemModule = await import("@linkwarden/filesystem");
      removeFolder = filesystemModule.removeFolder;

      importFromHTMLFile = (await import("./importFromHTMLFile")).default;

      await prisma.$connect();
    });

    afterEach(async () => {
      const users = createdUserIds.splice(0, createdUserIds.length);
      for (const userId of users) {
        await cleanupUser(userId);
      }
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    describe.sequential("importFromHTMLFile integration", () => {
      it("returns an error when the link limit is exceeded", async () => {
        const user = await createTestUser();

        const collection = await prisma.collection.create({
          data: {
            name: "Existing",
            owner: { connect: { id: user.id } },
            createdBy: { connect: { id: user.id } },
          },
        });

        for (let i = 0; i < 5; i += 1) {
          await prisma.link.create({
            data: {
              name: `Existing ${i}`,
              url: `https://example.com/existing-${i}`,
              collectionId: collection.id,
              createdById: user.id,
            },
          });
        }

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><A HREF="https://example.com/new">New</A></DT>
</DL><p>
</body>
</html>`;

        const beforeCount = await prisma.link.count({
          where: { createdById: user.id },
        });

        const result = await importFromHTMLFile(user.id, html);

        const afterCount = await prisma.link.count({
          where: { createdById: user.id },
        });

        expect(result).toEqual({
          response:
            "Your subscription has reached the maximum number of links allowed.",
          status: 400,
        });
        expect(afterCount).toBe(beforeCount);
      });

      it("imports root links into the Imports collection with tags, date, and description", async () => {
        const user = await createTestUser();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-04-10T12:34:56.000Z"));

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body>
<P>Bookmarks</P>
<DL><p>
<DT><A HREF="https://example.com/path?q=fish&amp;chips" ADD_DATE="1700000000" tags="news,tech">Example</A>
<DD>Example description</DD>
</DL><p>
</body>
</html>`;

        try {
          const result = await importFromHTMLFile(user.id, html);
          expect(result).toEqual({ response: "Success.", status: 200 });

          const importsCollection = await prisma.collection.findFirst({
            where: {
              ownerId: user.id,
              name: "Imported Bookmarks - 2026-04-10 12:34:56 UTC",
            },
          });

          expect(importsCollection).toBeTruthy();

          const link = await prisma.link.findFirst({
            where: {
              collectionId: importsCollection?.id,
              url: "https://example.com/path?q=fish&chips",
            },
            include: { tags: true },
          });

          expect(link).toBeTruthy();
          expect(link?.description).toBe("Example description");
          expect(link?.importDate?.toISOString()).toBe(
            new Date(1700000000 * 1000).toISOString()
          );
          expect(link?.tags.map((tag) => tag.name).sort()).toEqual([
            "news",
            "tech",
          ]);
        } finally {
          vi.useRealTimers();
        }
      });

      it("creates nested collections and assigns links to the correct parent", async () => {
        const user = await createTestUser();

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><H3>Recipes</H3>
<DL><p>
<DT><A HREF="https://example.com/soup">Soup</A></DT>
<DT><H3>Desserts</H3>
<DL><p>
<DT><A HREF="https://example.com/cake">Cake</A></DT>
</DL><p>
</DL><p>
</DL><p>
</body>
</html>`;

        await importFromHTMLFile(user.id, html);

        const recipesCollection = await prisma.collection.findFirst({
          where: { ownerId: user.id, name: "Recipes" },
        });

        expect(recipesCollection).toBeTruthy();

        const dessertsCollection = await prisma.collection.findFirst({
          where: {
            ownerId: user.id,
            name: "Desserts",
            parentId: recipesCollection?.id,
          },
        });

        expect(dessertsCollection).toBeTruthy();

        const soupLink = await prisma.link.findFirst({
          where: { url: "https://example.com/soup" },
        });

        const cakeLink = await prisma.link.findFirst({
          where: { url: "https://example.com/cake" },
        });

        expect(soupLink?.collectionId).toBe(recipesCollection?.id);
        expect(cakeLink?.collectionId).toBe(dessertsCollection?.id);
      });

      it("creates a fresh import root for each bookmark import", async () => {
        const user = await createTestUser();

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><A HREF="https://example.com/alpha">Alpha</A></DT>
<DT><A HREF="https://example.com/beta">Beta</A></DT>
</DL><p>
</body>
</html>`;

        vi.useFakeTimers();

        try {
          vi.setSystemTime(new Date("2026-04-10T12:34:56.000Z"));
          await importFromHTMLFile(user.id, html);

          vi.setSystemTime(new Date("2026-04-10T12:35:56.000Z"));
          await importFromHTMLFile(user.id, html);

          const importsCollections = await prisma.collection.findMany({
            where: {
              ownerId: user.id,
              name: {
                startsWith: "Imported Bookmarks - ",
              },
              parentId: null,
            },
            orderBy: { name: "asc" },
          });

          expect(importsCollections).toHaveLength(2);
          expect(
            importsCollections.map((collection) => collection.name)
          ).toEqual([
            "Imported Bookmarks - 2026-04-10 12:34:56 UTC",
            "Imported Bookmarks - 2026-04-10 12:35:56 UTC",
          ]);

          const importedLinks = await prisma.link.findMany({
            where: {
              createdById: user.id,
              url: {
                in: ["https://example.com/alpha", "https://example.com/beta"],
              },
            },
            orderBy: [{ url: "asc" }, { collectionId: "asc" }],
          });

          expect(importedLinks).toHaveLength(4);
          expect(
            new Set(importedLinks.map((link) => link.collectionId)).size
          ).toBe(2);
        } finally {
          vi.useRealTimers();
        }
      });

      it("keeps the same URL in separate collections across imports", async () => {
        const user = await createTestUser();

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><H3>Toolbar</H3>
<DL><p>
<DT><A HREF="https://example.com/shared">Shared</A></DT>
</DL><p>
</DL><p>
</body>
</html>`;

        vi.useFakeTimers();

        try {
          vi.setSystemTime(new Date("2026-04-10T12:34:56.000Z"));
          await importFromHTMLFile(user.id, html);

          vi.setSystemTime(new Date("2026-04-10T12:35:56.000Z"));
          await importFromHTMLFile(user.id, html);

          const links = await prisma.link.findMany({
            where: {
              createdById: user.id,
              url: "https://example.com/shared",
            },
            include: {
              collection: true,
            },
            orderBy: { collectionId: "asc" },
          });

          expect(links).toHaveLength(2);
          expect(new Set(links.map((link) => link.collectionId)).size).toBe(2);
          links.forEach((link) => {
            expect(link.collection.name).toBe("Toolbar");
          });
        } finally {
          vi.useRealTimers();
        }
      });

      it("falls back to an Untitled Collection when a folder name is empty", async () => {
        const user = await createTestUser();

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><H3></H3>
<DL><p>
<DT><A HREF="https://example.com/blank">Blank Folder</A></DT>
</DL><p>
</DL><p>
</body>
</html>`;

        await importFromHTMLFile(user.id, html);

        const untitledCollection = await prisma.collection.findFirst({
          where: { ownerId: user.id, name: "Untitled Collection" },
        });

        expect(untitledCollection).toBeTruthy();

        const link = await prisma.link.findFirst({
          where: { url: "https://example.com/blank" },
        });

        expect(link?.collectionId).toBe(untitledCollection?.id);
      });

      it("skips invalid URLs and only creates links for valid URLs", async () => {
        const user = await createTestUser();

        const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<html>
<body>
<DL><p>
<DT><A HREF="not a url">Broken</A></DT>
<DT><A HREF="https://valid.example.com">Valid</A></DT>
</DL><p>
</body>
</html>`;

        await importFromHTMLFile(user.id, html);

        const links = await prisma.link.findMany({
          where: { createdById: user.id },
        });

        expect(links).toHaveLength(1);
        expect(links[0]?.url).toBe("https://valid.example.com");
      });

      // it("keeps link ids in the same chronological order as importDate (createdAt fallback)", async () => {
      //   const user = await createTestUser();
      //   const nowSeconds = Math.floor(Date.now() / 1000);
      //   const olderSeconds = nowSeconds - 86400;
      //   const newerSeconds = nowSeconds + 86400;

      //   const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
      // <html>
      // <body>
      // <DL><p>
      // <DT><A HREF="https://example.com/old" ADD_DATE="${olderSeconds}">Old</A></DT>
      // <DT><A HREF="https://example.com/new" ADD_DATE="${newerSeconds}">New</A></DT>
      // <DT><A HREF="https://example.com/now">Now</A></DT>

      // <DT><H3>Folder One</H3>
      // <DL><p>
      // <DT><A HREF="https://example.com/f1-old" ADD_DATE="${olderSeconds}">F1 Old</A></DT>
      // <DT><A HREF="https://example.com/f1-new" ADD_DATE="${newerSeconds}">F1 New</A></DT>
      // </DL><p>

      // <DT><H3>Folder Two</H3>
      // <DL><p>
      // <DT><A HREF="https://example.com/f2-now">F2 Now</A></DT>
      // <DT><A HREF="https://example.com/f2-newer" ADD_DATE="${newerSeconds}">F2 Newer</A></DT>
      // </DL><p>

      // </DL><p>
      // </body>
      // </html>`;

      //   await importFromHTMLFile(user.id, html);

      //   const linksById = await prisma.link.findMany({
      //     where: { createdById: user.id },
      //     orderBy: { id: "asc" },
      //     select: { id: true, importDate: true, createdAt: true, url: true },
      //   });

      //   console.log(linksById);

      //   expect(linksById).toHaveLength(3);

      //   const idsByIdOrder = linksById.map((link) => link.id);
      //   const idsByEffectiveDateOrder = [...linksById]
      //     .sort(
      //       (a, b) =>
      //         (a.importDate ?? a.createdAt).getTime() -
      //         (b.importDate ?? b.createdAt).getTime()
      //     )
      //     .map((link) => link.id);

      //   expect(idsByIdOrder).toEqual(idsByEffectiveDateOrder);
      // });
    });
  }
);
