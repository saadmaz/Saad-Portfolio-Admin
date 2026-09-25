import { describe, it, expect, vi, beforeEach } from "vitest";

const { getDocsMock, addDocMock, updateDocMock, deleteDocMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  addDocMock: vi.fn(),
  updateDocMock: vi.fn(),
  deleteDocMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => ({ __col: name })),
  doc: vi.fn((_db, name: string, id: string) => ({ __col: name, __id: id })),
  getDocs: getDocsMock,
  addDoc: addDocMock,
  updateDoc: updateDocMock,
  deleteDoc: deleteDocMock,
  query: vi.fn((col) => col),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

// Imported after the mocks so the service picks up the mocked SDK.
const { CommonService } = await import("./common-service");

describe("CommonService reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps Firestore docs to typed objects with their id", async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        { id: "a1", data: () => ({ title: "Dean's List" }) },
        { id: "a2", data: () => ({ title: "Merit Scholar" }) },
      ],
    });

    const result = await CommonService.getAwards();

    expect(result).toEqual([
      { id: "a1", title: "Dean's List" },
      { id: "a2", title: "Merit Scholar" },
    ]);
  });

  it("propagates read failures instead of swallowing them into an empty array", async () => {
    // Regression test: fetchAll used to catch this and return [], which made
    // a failed read indistinguishable from a genuinely empty collection.
    getDocsMock.mockRejectedValueOnce(new Error("permission-denied"));

    await expect(CommonService.getAwards()).rejects.toThrow("permission-denied");
  });
});

describe("CommonService writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stamps created_at/updated_at and strips undefined fields on create", async () => {
    addDocMock.mockResolvedValueOnce({ id: "new-id" });

    const result = await CommonService.createAward({
      title: "New Award",
      issuer: undefined,
    });

    expect(addDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = addDocMock.mock.calls[0];
    expect(payload).toEqual({
      title: "New Award",
      created_at: "SERVER_TIMESTAMP",
      updated_at: "SERVER_TIMESTAMP",
    });
    expect(payload).not.toHaveProperty("issuer");
    expect(result).toMatchObject({ id: "new-id", title: "New Award" });
  });

  it("merge-updates only the fields passed in", async () => {
    updateDocMock.mockResolvedValueOnce(undefined);

    await CommonService.updateAward("a1", { title: "Renamed" });

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).toEqual({ title: "Renamed", updated_at: "SERVER_TIMESTAMP" });
  });

  it("deletes by id", async () => {
    deleteDocMock.mockResolvedValueOnce(undefined);

    await CommonService.deleteAward("a1");

    expect(deleteDocMock).toHaveBeenCalledTimes(1);
  });
});
