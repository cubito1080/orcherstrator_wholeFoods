import { afterEach, describe, expect, it, vi } from "vitest";
import { api, API_URL } from "./api-client";

describe("api-client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the configured API base URL for typed requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ id: "p1", name: "Project", status: "draft" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const projects = await api.listProjects();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/projects`, {
      headers: { "Content-Type": "application/json" },
    });
    expect(projects).toEqual([{ id: "p1", name: "Project", status: "draft" }]);
  });

  it("throws the server response body for failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad request", { status: 400 }));

    await expect(api.listProjects()).rejects.toThrow("bad request");
  });
});
