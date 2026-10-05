// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebsiteSessionProbe } from "./WebsiteSessionProbe";

const origin = window.location.origin;

function message(
  frame: HTMLIFrameElement,
  data: unknown,
  options: { origin?: string; source?: MessageEventSource | null } = {}
) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: options.origin ?? origin,
      source:
        options.source === undefined ? frame.contentWindow : options.source,
    })
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Website session probe", () => {
  it("waits for a child-ready message, sends one nonce, and accepts only its matching response", async () => {
    const onStatus = vi.fn();
    const view = render(<WebsiteSessionProbe onStatus={onStatus} />);
    const frame = await waitFor(() => {
      const element = view.container.querySelector("iframe");
      expect(element).not.toBeNull();
      return element!;
    });
    const post = vi
      .spyOn(frame.contentWindow!, "postMessage")
      .mockImplementation(() => {});
    act(() =>
      message(
        frame,
        { type: "identity-status-ready" },
        { origin: "https://other.example" }
      )
    );
    act(() =>
      message(frame, { type: "identity-status-ready" }, { source: window })
    );
    expect(post).not.toHaveBeenCalled();
    act(() => message(frame, { type: "identity-status-ready" }));
    expect(post).toHaveBeenCalledTimes(1);
    const request = post.mock.calls[0][0] as { type: string; nonce: string };
    expect(request.type).toBe("identity-status-request");
    expect(request.nonce).toMatch(/^[A-Za-z0-9_-]{22,128}$/);
    expect(post.mock.calls[0][1]).toBe(origin);

    act(() =>
      message(frame, {
        type: "identity-status",
        nonce: "wrong",
        status: "active",
      })
    );
    act(() =>
      message(
        frame,
        { type: "identity-status", nonce: request.nonce, status: "active" },
        { source: window }
      )
    );
    expect(onStatus).not.toHaveBeenCalled();
    act(() =>
      message(frame, {
        type: "identity-status",
        nonce: request.nonce,
        status: "active",
      })
    );
    expect(onStatus).toHaveBeenCalledExactlyOnceWith("active");
    act(() =>
      message(frame, {
        type: "identity-status",
        nonce: request.nonce,
        status: "anonymous",
      })
    );
    expect(onStatus).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable at one second and discards a late active response", async () => {
    vi.useFakeTimers();
    const onStatus = vi.fn();
    const view = render(<WebsiteSessionProbe onStatus={onStatus} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const frame = view.container.querySelector("iframe")!;
    const post = vi
      .spyOn(frame.contentWindow!, "postMessage")
      .mockImplementation(() => {});
    act(() => message(frame, { type: "identity-status-ready" }));
    const request = post.mock.calls[0][0] as { nonce: string };
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onStatus).toHaveBeenCalledExactlyOnceWith("unavailable");
    act(() =>
      message(frame, {
        type: "identity-status",
        nonce: request.nonce,
        status: "active",
      })
    );
    expect(onStatus).toHaveBeenCalledTimes(1);
  });
});
