import { randomUUID } from "node:crypto";
import type { LinkedSessionCheck } from "./SessionGuard";

export default class WebsiteIdentityClient {
  private readonly baseUrl: URL;
  constructor(
    baseUrl: string,
    private readonly integrationKey: string
  ) {
    this.baseUrl = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(this.baseUrl.protocol) ||
      this.baseUrl.pathname !== "/" ||
      this.baseUrl.search ||
      this.baseUrl.hash ||
      !integrationKey
    ) {
      throw new Error("Website identity client configuration is invalid");
    }
  }

  private async request<T>(
    path: string,
    payload: Record<string, string>
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Integration-Key": this.integrationKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(1000),
      });
    } catch {
      throw new Error("Website identity is unavailable");
    }
    if (!response.ok) {
      throw new Error("Website identity rejected the internal request");
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error("Website identity response is invalid");
    }
  }

  check(hydraSid: string, subject: string): Promise<LinkedSessionCheck> {
    return this.request<LinkedSessionCheck>(
      "/api/internal/identity/session/check",
      { hydraSid, subject }
    );
  }

  async revoke(
    hydraSid: string,
    subject: string,
    requestId = randomUUID()
  ): Promise<void> {
    const response = await this.request<{ revoked: true }>(
      "/api/internal/identity/session/revoke",
      { hydraSid, subject, requestId }
    );
    if (response.revoked !== true) {
      throw new Error("Website identity revocation response is invalid");
    }
  }
}
