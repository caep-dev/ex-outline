import { useEffect, useRef, useState } from "react";

export interface WebsiteSessionProbeProps {
  onStatus: (status: "active" | "anonymous" | "unavailable") => void;
}

/** Probes the same-origin Website session without passing Bearer credentials to Outline. */
export function WebsiteSessionProbe({ onStatus }: WebsiteSessionProbeProps) {
  const [mounted, setMounted] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const generation = useRef(0);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    const current = ++generation.current;
    const origin = window.location.origin;
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const nonce = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    let requested = false;
    let settled = false;
    const finish = (status: "active" | "anonymous" | "unavailable") => {
      if (settled || current !== generation.current) {
        return;
      }
      settled = true;
      clearTimeout(deadline);
      onStatusRef.current(status);
    };
    const deadline = setTimeout(() => finish("unavailable"), 1_000);
    const handleMessage = (event: MessageEvent) => {
      if (
        settled ||
        event.origin !== origin ||
        event.source !== frame.current?.contentWindow
      ) {
        return;
      }
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null || !("type" in data)) {
        return;
      }
      if (data.type === "identity-status-ready" && !requested) {
        requested = true;
        frame.current?.contentWindow?.postMessage(
          { type: "identity-status-request", nonce },
          origin
        );
        return;
      }
      if (
        requested &&
        data.type === "identity-status" &&
        "nonce" in data &&
        data.nonce === nonce &&
        "status" in data &&
        (data.status === "active" ||
          data.status === "anonymous" ||
          data.status === "unavailable")
      ) {
        finish(data.status);
      }
    };

    window.addEventListener("message", handleMessage);
    // Rendering the iframe after installing the listener makes the ready handshake reliable.
    setMounted(true);
    return () => {
      generation.current += 1;
      clearTimeout(deadline);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return mounted ? (
    <iframe
      ref={frame}
      hidden
      title="Website session status"
      src="/identity/status"
      referrerPolicy="no-referrer"
    />
  ) : null;
}
