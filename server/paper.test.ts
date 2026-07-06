import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getPaperById: vi.fn(),
  getPapersByUserId: vi.fn(),
  getAnalysesByPaperId: vi.fn(),
}));

import { getPaperById, getPapersByUserId, getAnalysesByPaperId } from "./db";

const mockPaper = {
  id: 1,
  userId: 1,
  title: "DFT Study of Molecular Interactions",
  abstract: "We present a density functional theory study...",
  keywords: JSON.stringify(["DFT", "molecular dynamics", "quantum chemistry"]),
  directions: JSON.stringify(["DFT", "Molecular Dynamics"]),
  fileKey: "papers/1/test.pdf",
  fileUrl: "/manus-storage/papers/1/test.pdf",
  fileName: "test-paper.pdf",
  fileSize: 1024000,
  extractedText: "Full paper text here...",
  status: "completed" as const,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAnalyses = [
  {
    id: 1,
    paperId: 1,
    direction: "DFT",
    directionCn: "密度泛函理论",
    summary: "The paper uses DFT for electronic structure calculations",
    content: "# DFT Analysis\n\nDetailed content here...",
    status: "completed" as const,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    paperId: 1,
    direction: "Molecular Dynamics",
    directionCn: "分子动力学",
    summary: "MD simulations were performed...",
    content: "# Molecular Dynamics\n\nDetailed content...",
    status: "completed" as const,
    orderIndex: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function createAuthContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("paper.getById", () => {
  it("returns paper with parsed JSON fields for the owner", async () => {
    (getPaperById as any).mockResolvedValue(mockPaper);

    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.getById({ id: 1 });

    expect(result).not.toBeNull();
    expect(result!.title).toBe("DFT Study of Molecular Interactions");
    expect(result!.keywords).toEqual(["DFT", "molecular dynamics", "quantum chemistry"]);
    expect(result!.directions).toEqual(["DFT", "Molecular Dynamics"]);
    // Should not expose extracted text
    expect(result!.extractedText).toBeUndefined();
  });

  it("returns null for non-owner", async () => {
    (getPaperById as any).mockResolvedValue(mockPaper);

    const ctx = createAuthContext(999); // different user
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.getById({ id: 1 });

    expect(result).toBeNull();
  });

  it("returns null for non-existent paper", async () => {
    (getPaperById as any).mockResolvedValue(undefined);

    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.getById({ id: 999 });

    expect(result).toBeNull();
  });
});

describe("paper.list", () => {
  it("returns papers for authenticated user", async () => {
    (getPapersByUserId as any).mockResolvedValue([mockPaper]);

    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.list();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("DFT Study of Molecular Interactions");
    expect(result[0].keywords).toEqual(["DFT", "molecular dynamics", "quantum chemistry"]);
  });

  it("throws for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.paper.list()).rejects.toThrow();
  });
});

describe("paper.getAnalyses", () => {
  it("returns analyses for paper owned by user", async () => {
    (getPaperById as any).mockResolvedValue(mockPaper);
    (getAnalysesByPaperId as any).mockResolvedValue(mockAnalyses);

    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.getAnalyses({ paperId: 1 });

    expect(result).toHaveLength(2);
    expect(result[0].direction).toBe("DFT");
    expect(result[1].direction).toBe("Molecular Dynamics");
  });

  it("returns empty array for non-owner", async () => {
    (getPaperById as any).mockResolvedValue(mockPaper);

    const ctx = createAuthContext(999);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.paper.getAnalyses({ paperId: 1 });

    expect(result).toEqual([]);
  });
});
