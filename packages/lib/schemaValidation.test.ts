import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  PostTokenSchema,
  PostSessionSchema,
  PostLinkSchema,
  UpdateLinkSchema,
  PostCollectionSchema,
  UpdateCollectionSchema,
  UpdateTagSchema,
  PostRssSubscriptionSchema,
  PostHighlightSchema,
  TagBulkDeletionSchema,
  MergeTagsSchema,
} from "./schemaValidation";

describe("ForgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = ForgotPasswordSchema.safeParse({
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = ForgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("ResetPasswordSchema", () => {
  it("accepts valid token and password", () => {
    const result = ResetPasswordSchema.safeParse({
      token: "abc123",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = ResetPasswordSchema.safeParse({
      token: "abc123",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing token", () => {
    const result = ResetPasswordSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 8 character password", () => {
    const result = ResetPasswordSchema.safeParse({
      token: "abc123",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });
});

describe("VerifyEmailSchema", () => {
  it("accepts valid token", () => {
    const result = VerifyEmailSchema.safeParse({
      token: "verification-token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const result = VerifyEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("PostTokenSchema", () => {
  it("validates name field is required", () => {
    const result = PostTokenSchema.safeParse({
      expires: "sevenDays",
    });
    expect(result.success).toBe(false);
  });

  it("validates expires field is required", () => {
    const result = PostTokenSchema.safeParse({
      name: "My API Token",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid expiry value", () => {
    const result = PostTokenSchema.safeParse({
      name: "My API Token",
      expires: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 50 characters with valid enum", () => {
    const result = PostTokenSchema.safeParse({
      name: "a".repeat(51),
      expires: 0, // Using numeric enum value
    });
    expect(result.success).toBe(false);
  });
});

describe("PostSessionSchema", () => {
  it("accepts valid username and password", () => {
    const result = PostSessionSchema.safeParse({
      username: "testuser",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects username shorter than 3 characters", () => {
    const result = PostSessionSchema.safeParse({
      username: "ab",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects username longer than 50 characters", () => {
    const result = PostSessionSchema.safeParse({
      username: "a".repeat(51),
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = PostSessionSchema.safeParse({
      username: "testuser",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional sessionName", () => {
    const result = PostSessionSchema.safeParse({
      username: "testuser",
      password: "password123",
      sessionName: "My Browser",
    });
    expect(result.success).toBe(true);
  });

  it("rejects sessionName longer than 50 characters", () => {
    const result = PostSessionSchema.safeParse({
      username: "testuser",
      password: "password123",
      sessionName: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe("PostLinkSchema", () => {
  it("accepts valid URL link", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts link with name and description", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com",
      name: "Example Site",
      description: "An example website",
    });
    expect(result.success).toBe(true);
  });

  it("accepts link with collection", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com",
      collection: {
        id: 1,
        name: "My Collection",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts link with tags", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com",
      tags: [
        { name: "tag1" },
        { id: 1, name: "tag2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects URL longer than 2048 characters", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com/" + "a".repeat(2048),
    });
    expect(result.success).toBe(false);
  });

  it("accepts pdf type", () => {
    const result = PostLinkSchema.safeParse({
      type: "pdf",
    });
    expect(result.success).toBe(true);
  });

  it("accepts image type", () => {
    const result = PostLinkSchema.safeParse({
      type: "image",
    });
    expect(result.success).toBe(true);
  });

  it("accepts tag name up to 50 characters", () => {
    const result = PostLinkSchema.safeParse({
      type: "url",
      url: "https://example.com",
      tags: [{ name: "a".repeat(50) }],
    });
    expect(result.success).toBe(true);
  });
});

describe("PostCollectionSchema", () => {
  it("accepts valid collection", () => {
    const result = PostCollectionSchema.safeParse({
      name: "My Collection",
    });
    expect(result.success).toBe(true);
  });

  it("accepts collection with all fields", () => {
    const result = PostCollectionSchema.safeParse({
      name: "My Collection",
      description: "A collection of links",
      color: "#ff0000",
      icon: "folder",
      iconWeight: "bold",
      parentId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty name (after trim)", () => {
    const result = PostCollectionSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("");
    }
  });

  it("rejects name longer than 2048 characters", () => {
    const result = PostCollectionSchema.safeParse({
      name: "a".repeat(2049),
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = PostCollectionSchema.safeParse({
      name: "  My Collection  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("My Collection");
    }
  });
});

describe("UpdateCollectionSchema", () => {
  it("accepts valid update", () => {
    const result = UpdateCollectionSchema.safeParse({
      id: 1,
      name: "Updated Collection",
      members: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts collection with members", () => {
    const result = UpdateCollectionSchema.safeParse({
      id: 1,
      name: "My Collection",
      members: [
        {
          userId: 2,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts parentId as number", () => {
    const result = UpdateCollectionSchema.safeParse({
      id: 1,
      name: "My Collection",
      parentId: 5,
      members: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts parentId as 'root'", () => {
    const result = UpdateCollectionSchema.safeParse({
      id: 1,
      name: "My Collection",
      parentId: "root",
      members: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = UpdateCollectionSchema.safeParse({
      name: "My Collection",
      members: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateTagSchema", () => {
  it("accepts valid tag name", () => {
    const result = UpdateTagSchema.safeParse({
      name: "my-tag",
    });
    expect(result.success).toBe(true);
  });

  it("rejects tag name longer than 50 characters", () => {
    const result = UpdateTagSchema.safeParse({
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace", () => {
    const result = UpdateTagSchema.safeParse({
      name: "  my-tag  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("my-tag");
    }
  });
});

describe("PostRssSubscriptionSchema", () => {
  it("accepts valid RSS subscription", () => {
    const result = PostRssSubscriptionSchema.safeParse({
      name: "My Feed",
      url: "https://example.com/feed.xml",
    });
    expect(result.success).toBe(true);
  });

  it("accepts RSS subscription with collection", () => {
    const result = PostRssSubscriptionSchema.safeParse({
      name: "My Feed",
      url: "https://example.com/feed.xml",
      collectionId: 1,
      collectionName: "RSS Feeds",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = PostRssSubscriptionSchema.safeParse({
      name: "My Feed",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 50 characters", () => {
    const result = PostRssSubscriptionSchema.safeParse({
      name: "a".repeat(51),
      url: "https://example.com/feed.xml",
    });
    expect(result.success).toBe(false);
  });
});

describe("PostHighlightSchema", () => {
  it("accepts valid highlight", () => {
    const result = PostHighlightSchema.safeParse({
      color: "#ffff00",
      startOffset: 0,
      endOffset: 100,
      text: "Highlighted text",
      linkId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts highlight with comment", () => {
    const result = PostHighlightSchema.safeParse({
      color: "#ffff00",
      comment: "This is important",
      startOffset: 0,
      endOffset: 100,
      text: "Highlighted text",
      linkId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = PostHighlightSchema.safeParse({
      color: "#ffff00",
    });
    expect(result.success).toBe(false);
  });
});

describe("TagBulkDeletionSchema", () => {
  it("accepts array of tag IDs", () => {
    const result = TagBulkDeletionSchema.safeParse({
      tagIds: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty array", () => {
    const result = TagBulkDeletionSchema.safeParse({
      tagIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts single tag ID", () => {
    const result = TagBulkDeletionSchema.safeParse({
      tagIds: [1],
    });
    expect(result.success).toBe(true);
  });
});

describe("MergeTagsSchema", () => {
  it("accepts valid merge request", () => {
    const result = MergeTagsSchema.safeParse({
      newTagName: "merged-tag",
      tagIds: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty tag IDs", () => {
    const result = MergeTagsSchema.safeParse({
      newTagName: "merged-tag",
      tagIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects tag name longer than 50 characters", () => {
    const result = MergeTagsSchema.safeParse({
      newTagName: "a".repeat(51),
      tagIds: [1, 2],
    });
    expect(result.success).toBe(false);
  });
});
