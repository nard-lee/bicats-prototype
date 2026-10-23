import { afterEach, describe, expect, it, vi } from "vitest";

import { runSideEffect } from "../src/utils/side-effect.js";

describe("runSideEffect", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs rejected side effects instead of letting them escape", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = Promise.reject(new Error("settings lookup failed"));

    expect(() => runSideEffect("notifications: status update", failure)).not.toThrow();

    // The helper's catch is attached first, so it has run by the time this settles.
    await failure.catch(() => undefined);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "==> notifications: status update failed",
      expect.objectContaining({ message: "settings lookup failed" }),
    );
  });

  it("stays silent when the side effect resolves", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const done = vi.fn();

    runSideEffect("notifications: status update", Promise.resolve().then(done));
    await Promise.resolve();
    await Promise.resolve();

    expect(done).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
