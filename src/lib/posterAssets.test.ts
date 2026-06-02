import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const listMock = vi.fn();
  const getPublicUrlMock = vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.test/${path}` },
  }));
  const inMock = vi.fn(() => Promise.resolve({ data: [] }));
  const selectMock = vi.fn(() => ({ in: inMock }));
  const fromMock = vi.fn(() => ({ list: listMock, getPublicUrl: getPublicUrlMock }));
  const tableMock = vi.fn(() => ({ select: selectMock }));
  return {
    supabase: { storage: { from: fromMock }, from: tableMock },
    __mocks: { listMock, fromMock },
  };
});

import { listSponsors } from "./posterAssets";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mocks } = (await import("@/integrations/supabase/client")) as any;
const { listMock, fromMock } = __mocks;

describe("listSponsors", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("returns sponsors in deterministic alphabetical order", async () => {
    listMock.mockResolvedValueOnce({
      data: [
        { name: "zeta.png" },
        { name: "alpha.png" },
        { name: "mike.png" },
        { name: ".hidden" },
      ],
      error: null,
    });

    const result = await listSponsors("comp-1");
    expect(result.map((r) => r.name)).toEqual([
      "alpha.png",
      "mike.png",
      "zeta.png",
    ]);
  });

  it("returns empty array on storage error (graceful fallback)", async () => {
    listMock.mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    const result = await listSponsors("comp-1");
    expect(result).toEqual([]);
  });

  it("requests files from the competition's sponsors folder", async () => {
    listMock.mockResolvedValueOnce({ data: [], error: null });
    await listSponsors("comp-xyz");
    expect(fromMock).toHaveBeenCalledWith("competition-posters");
    expect(listMock).toHaveBeenCalledWith(
      "comp-xyz/sponsors",
      expect.objectContaining({ limit: 100 })
    );
  });
});

describe("anonymous sponsor access (integration smoke test)", () => {
  it("anonymous Supabase client can list the competition-posters bucket", async () => {
    // Skip when no live Supabase URL is configured in the test env.
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      console.warn("Skipping anon smoke test: VITE_SUPABASE_* not set");
      return;
    }
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(url, key);
    const { error } = await anon.storage.from("competition-posters").list("", {
      limit: 1,
    });
    // The crucial assertion: anonymous SELECT must NOT be blocked by RLS.
    // An empty bucket is fine (data may be [] / null); only RLS denial is a fail.
    if (error) {
      expect(error.message).not.toMatch(/permission|denied|not authorized|rls/i);
    }
  });
});
