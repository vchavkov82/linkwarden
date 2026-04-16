import {
  hasPendingServerManagedPreview,
  shouldGeneratePreviewOnDemand,
} from "./previewState";

describe("shouldGeneratePreviewOnDemand", () => {
  it("returns false for client-managed previews", () => {
    expect(
      shouldGeneratePreviewOnDemand({
        clientSide: true,
        preview: null,
      })
    ).toBe(false);
  });

  it("returns false when preview is unavailable", () => {
    expect(
      shouldGeneratePreviewOnDemand({
        clientSide: false,
        preview: "unavailable",
      })
    ).toBe(false);
  });

  it("returns true for missing server-managed previews", () => {
    expect(
      shouldGeneratePreviewOnDemand({
        clientSide: false,
        preview: null,
      })
    ).toBe(true);
  });
});

describe("hasPendingServerManagedPreview", () => {
  it("returns false when only client-managed previews are pending", () => {
    expect(
      hasPendingServerManagedPreview([
        { clientSide: true, preview: null },
        { clientSide: true, preview: "" },
      ])
    ).toBe(false);
  });

  it("returns true when a server-managed preview is pending", () => {
    expect(
      hasPendingServerManagedPreview([
        { clientSide: true, preview: null },
        { clientSide: false, preview: null },
      ])
    ).toBe(true);
  });

  it("returns false when all previews are final", () => {
    expect(
      hasPendingServerManagedPreview([
        { clientSide: false, preview: "archives/preview/1/1.jpeg" },
        { clientSide: false, preview: "unavailable" },
      ])
    ).toBe(false);
  });
});
