import { vi } from "vitest";
import SessionGuard from "./SessionGuard";

const session = {
  id: "11111111-1111-4111-8111-111111111111",
  websiteSessionId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
  hydraSid: "sid",
  clientId: "ex-outline",
  websiteSubject: "44444444-4444-4444-8444-444444444444",
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
};

describe("Website session guard", () => {
  afterEach(() => vi.useRealTimers());

  it("checks every protected HTTP request and refuses a mismatched binding", async () => {
    const check = vi.fn().mockResolvedValue({
      active: true,
      sessionId: session.websiteSessionId,
      userId: session.websiteSubject,
      expiresAt: Date.now() + 60_000,
    });
    const guard = new SessionGuard({ check });
    await guard.assertCurrent(session);
    await guard.assertCurrent(session);
    expect(check).toHaveBeenCalledTimes(2);
    expect(check).toHaveBeenCalledWith(
      session.hydraSid,
      session.websiteSubject
    );
    check.mockResolvedValueOnce({
      active: true,
      sessionId: "other",
      userId: session.websiteSubject,
      expiresAt: Date.now() + 60_000,
    });
    await expect(guard.assertCurrent(session)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("never renews a real-time lease from a late response after invalidation", async () => {
    vi.useFakeTimers();
    let resolveCheck!: (value: unknown) => void;
    const check = vi
      .fn()
      .mockImplementationOnce(async () => ({
        active: true,
        sessionId: session.websiteSessionId,
        userId: session.websiteSubject,
        expiresAt: Date.now() + 60_000,
      }))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCheck = resolve;
          })
      );
    const close = vi.fn();
    const guard = new SessionGuard({ check, now: () => performance.now() });
    const lease = await guard.openLease(session, close);
    expect(lease.isActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    guard.invalidate({ sessionId: session.websiteSessionId });
    expect(lease.isActive()).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    resolveCheck({
      active: true,
      sessionId: session.websiteSessionId,
      userId: session.websiteSubject,
      expiresAt: Date.now() + 60_000,
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(lease.isActive()).toBe(false);
  });
});
