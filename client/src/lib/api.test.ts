import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Recorded = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

const NativeRequest = globalThis.Request;

// jsdom has no Request/fetch, so vitest hands tests undici's versions — but
// undici rejects the relative URLs ky builds, while browsers resolve them
// against the document. Emulate that, and treat every native Request as one
// of ours because Request#clone() returns the base class.
class BrowserRequest extends NativeRequest {
  static [Symbol.hasInstance](value: unknown): boolean {
    return value instanceof NativeRequest;
  }

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(
      typeof input === "string" && !/^[a-z][\d+.a-z-]*:/i.test(input)
        ? new URL(input, "http://localhost:3000").href
        : input,
      init,
    );
  }
}

const recorded: Recorded[] = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
  const request = input instanceof Request ? input : new Request(input);
  recorded.push({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: await request.clone().text(),
  });

  if (request.method === "GET") return jsonResponse({ csrfToken: "tok-123" });
  if (request.url.includes("/auth/refresh")) return jsonResponse({ success: true });

  const attempts = recorded.filter(
    (call) => call.method === "POST" && call.url.includes("/complaints"),
  ).length;
  return attempts === 1
    ? jsonResponse({ message: "expired" }, 401)
    : jsonResponse({ success: true });
});

describe("api 401 retry", () => {
  beforeEach(() => {
    recorded.length = 0;
    fetchMock.mockClear();
    vi.resetModules();
    vi.stubGlobal("Request", BrowserRequest);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a rejected mutating request with its CSRF token and body intact", async () => {
    const { api } = await import("./api");

    const body = await api
      .post("complaints", { json: { complainantName: "Juan" } })
      .json();

    expect(body).toEqual({ success: true });
    expect(
      recorded.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual([
      "GET /api/csrf-token",
      "POST /api/complaints",
      "POST /api/auth/refresh",
      "POST /api/complaints",
    ]);

    const [original, retried] = recorded.filter((call) =>
      call.url.includes("/complaints"),
    );
    expect(original!.headers["x-csrf-token"]).toBe("tok-123");
    expect(retried!.headers["x-csrf-token"]).toBe("tok-123");
    expect(JSON.parse(retried!.body)).toEqual({ complainantName: "Juan" });
  });

  it("surfaces the original 401 when the refresh fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const request = input instanceof Request ? input : new Request(input);
        if (request.method === "GET") return jsonResponse({ csrfToken: "tok-123" });
        if (request.url.includes("/auth/refresh")) {
          return jsonResponse({ message: "Invalid session" }, 401);
        }
        return jsonResponse({ message: "expired" }, 401);
      }),
    );

    const { api } = await import("./api");

    const failure = await api
      .post("complaints", { json: { complainantName: "Juan" } })
      .catch((err: { response?: Response }) => err.response);

    expect(failure?.status).toBe(401);
  });

  it("does not fetch a CSRF token for safe requests", async () => {
    const { api } = await import("./api");

    await api.get("auth/bootstrap").json();

    expect(
      recorded.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual(["GET /api/auth/bootstrap"]);
  });

  it("refetches the CSRF token after a 403 rejection", async () => {
    let tokenFetches = 0;
    const postTokens: Array<string | null> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const request = input instanceof Request ? input : new Request(input);
        if (request.method === "GET") {
          tokenFetches += 1;
          return jsonResponse({ csrfToken: `tok-${tokenFetches}` });
        }
        postTokens.push(request.headers.get("x-csrf-token"));
        return postTokens.length === 1
          ? jsonResponse({ message: "invalid csrf token" }, 403)
          : jsonResponse({ success: true });
      }),
    );

    const { api } = await import("./api");

    const rejected = await api
      .post("complaints", { json: { complainantName: "Juan" } })
      .catch((err: { response?: Response }) => err.response);
    expect(rejected?.status).toBe(403);

    await api.post("complaints", { json: { complainantName: "Juan" } });

    expect(postTokens).toEqual(["tok-1", "tok-2"]);
  });
});
