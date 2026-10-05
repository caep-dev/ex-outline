export type ExternalSessionRef = {
  id: string;
  websiteSessionId: string;
  userId: string;
  websiteSubject: string;
  hydraSid: string;
  clientId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type LinkedSessionCheck =
  | {
      active: true;
      sessionId: string;
      userId: string;
      expiresAt: number;
      profile: {
        nickname: string;
        email: string;
        avatarUrl: string | null;
        version: number;
      };
    }
  | { active: false; reason: string };

export class SessionGuardError extends Error {
  constructor(readonly status: 401 | 503) {
    super(
      status === 401
        ? "Website session is inactive"
        : "Website identity is unavailable"
    );
  }
}

type Check = (hydraSid: string, subject: string) => Promise<LinkedSessionCheck>;

export class SessionLease {
  private deadline = 0;
  private generation = 0;
  private closed = false;
  private checking = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private watchdogTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly guard: SessionGuard,
    readonly session: ExternalSessionRef,
    private readonly closeConnection: () => void
  ) {}

  async start() {
    const sentAt = this.guard.monotonicNow();
    const result = await this.guard.assertCurrent(this.session);
    this.renew(sentAt, result.expiresAt);
    this.pollTimer = setInterval(() => void this.poll(), 2000);
    this.watchdogTimer = setInterval(() => {
      if (!this.isActive()) {
        this.invalidate();
      }
    }, 250);
  }

  isActive() {
    return (
      !this.closed &&
      this.guard.monotonicNow() < this.deadline &&
      Date.now() < this.session.expiresAt.getTime()
    );
  }

  assertActive() {
    if (!this.isActive()) {
      throw new SessionGuardError(401);
    }
  }

  invalidate() {
    if (this.closed) {
      return;
    }
    this.generation++;
    this.closed = true;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
    }
    this.guard.release(this);
    this.closeConnection();
  }

  private renew(sentAt: number, expiresAt: number) {
    this.deadline = Math.min(
      sentAt + 4000,
      this.guard.monotonicNow() + Math.max(0, expiresAt - Date.now())
    );
    if (!this.isActive()) {
      this.invalidate();
    }
  }

  private async poll() {
    if (this.checking || !this.isActive()) {
      return;
    }
    this.checking = true;
    const generation = this.generation;
    const sentAt = this.guard.monotonicNow();
    try {
      const result = await this.guard.assertCurrent(this.session);
      if (!this.closed && generation === this.generation) {
        this.renew(sentAt, result.expiresAt);
      }
    } catch {
      this.invalidate();
    } finally {
      this.checking = false;
    }
  }
}

export default class SessionGuard {
  private readonly leases = new Set<SessionLease>();
  private readonly now: () => number;
  constructor(private readonly options: { check: Check; now?: () => number }) {
    this.now = options.now ?? (() => performance.now());
  }

  monotonicNow() {
    return this.now();
  }

  async assertCurrent(session: ExternalSessionRef) {
    if (session.revokedAt || Date.now() >= session.expiresAt.getTime()) {
      throw new SessionGuardError(401);
    }
    let result: LinkedSessionCheck;
    try {
      result = await this.options.check(
        session.hydraSid,
        session.websiteSubject
      );
    } catch {
      throw new SessionGuardError(503);
    }
    if (
      !result.active ||
      result.sessionId !== session.websiteSessionId ||
      result.userId !== session.websiteSubject ||
      Date.now() >= result.expiresAt
    ) {
      throw new SessionGuardError(401);
    }
    return result;
  }

  async openLease(
    session: ExternalSessionRef,
    close: () => void
  ): Promise<SessionLease> {
    const lease = new SessionLease(this, session, close);
    await lease.start();
    if (lease.isActive()) {
      this.leases.add(lease);
    }
    return lease;
  }

  invalidate(scope: { sessionId?: string; userId?: string }) {
    for (const lease of this.leases) {
      if (
        (scope.sessionId &&
          lease.session.websiteSessionId === scope.sessionId) ||
        (scope.userId && lease.session.userId === scope.userId)
      ) {
        lease.invalidate();
      }
    }
  }

  release(lease: SessionLease) {
    this.leases.delete(lease);
  }
}
