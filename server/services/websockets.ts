import type { IncomingMessage } from "node:http";
import type http from "node:http";
import type { Duplex } from "node:stream";
import cookie from "cookie";
import type Koa from "koa";
import IO from "socket.io";
import { createAdapter } from "socket.io-redis";
import { errToId, errToString, toError } from "@shared/utils/error";
import { isAllowedDevelopmentOrigin } from "@shared/utils/publicPath";
import env from "@server/env";
import {
  authenticateExternalToken,
  websiteSessionGuard,
} from "@server/identity/authenticateExternalSession";
import type { SessionLease } from "@server/identity/SessionGuard";
import { AuthenticationError } from "@server/errors";
import Logger from "@server/logging/Logger";
import Metrics from "@server/logging/Metrics";
import * as Tracing from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import type { User } from "@server/models";
import { rejectUpgrade } from "@server/onupgrade";
import Redis from "@server/storage/redis";
import { revocationChannel } from "@server/routes/internalIdentity";
import ShutdownHelper, { ShutdownOrder } from "@server/utils/ShutdownHelper";
import { getUserForJWT } from "@server/utils/jwt";
import { websocketQueue } from "../queues";
import WebsocketsProcessor from "../queues/processors/WebsocketsProcessor";

type SocketWithAuth = IO.Socket & {
  client: IO.Socket["client"] & {
    auth?: {
      userId: string;
      teamId: string;
      websiteSessionId?: string;
      lease?: SessionLease;
    };
  };
};

export default function init(
  app: Koa,
  server: http.Server,
  serviceNames: string[]
) {
  const path = "/realtime";

  // Websockets for events and non-collaborative documents
  const io = new IO.Server(server, {
    path,
    serveClient: false,
    cookie: false,
    pingInterval: 15000,
    pingTimeout: 30000,
    cors: {
      // Included for completeness, though CORS does not apply to websocket transport.
      origin: env.isCloudHosted ? "*" : env.URL,
      methods: ["GET", "POST"],
    },
  });

  // Remove the upgrade handler that we just added when registering the IO engine
  // And re-add it with a check to only handle the realtime path, this allows
  // collaboration websockets to exist in the same process as engine.io.
  const listeners = server.listeners("upgrade");
  const ioHandleUpgrade = listeners.pop();

  if (ioHandleUpgrade) {
    server.removeListener(
      "upgrade",
      ioHandleUpgrade as (...args: unknown[]) => void
    );
  }

  server.on(
    "upgrade",
    function (req: IncomingMessage, socket: Duplex, head: Buffer) {
      if (req.url?.startsWith(path) && ioHandleUpgrade) {
        // For on-premise deployments, ensure the websocket origin matches the deployed URL.
        // In cloud-hosted we support any origin for custom domains.
        if (
          !env.isCloudHosted &&
          (!req.headers.origin || !env.URL.startsWith(req.headers.origin)) &&
          !(
            env.isDevelopment &&
            isAllowedDevelopmentOrigin(
              req.headers.origin,
              (process.env.OUTLINE_DEV_MOUNT_ORIGINS || "").split(",")
            )
          )
        ) {
          rejectUpgrade(socket);
          return;
        }

        ioHandleUpgrade(req, socket, head);
        return;
      }

      if (serviceNames.includes("collaboration")) {
        // Nothing to do, the collaboration service will handle this request
        return;
      }

      // If the collaboration service isn't running then we need to close the connection
      rejectUpgrade(socket);
    }
  );

  ShutdownHelper.add("websockets", ShutdownOrder.normal, async () => {
    Metrics.gaugePerInstance("websockets.count", 0);
  });

  io.adapter(
    createAdapter({
      pubClient: Redis.defaultClient,
      subClient: Redis.defaultSubscriber,
    })
  );

  io.of("/").adapter.on("error", (err: Error) => {
    if (err.name === "MaxRetriesPerRequestError") {
      Logger.fatal("Redis maximum retries exceeded in socketio adapter", err);
    } else {
      Logger.error("Redis error in socketio adapter", err);
    }
  });

  if (env.WEBSITE_INTEGRATION_ENABLED) {
    const adapter = io.of("/").adapter;
    const broadcast = adapter.broadcast.bind(adapter);
    adapter.broadcast = (packet, options) => {
      for (const socket of io.sockets.sockets.values()) {
        const lease = (socket as SocketWithAuth).client.auth?.lease;
        if (lease && !lease.isActive()) {
          lease.invalidate();
        }
      }
      return broadcast(packet, options);
    };
    const subscriber = Redis.defaultSubscriber;
    void subscriber.subscribe(revocationChannel);
    subscriber.on("message", (channel, payload) => {
      if (channel !== revocationChannel) {
        return;
      }
      try {
        const scope = JSON.parse(payload) as {
          sessionId?: string;
          userId?: string;
        };
        websiteSessionGuard().invalidate(scope);
        for (const socket of io.sockets.sockets.values()) {
          const auth = (socket as SocketWithAuth).client.auth;
          if (
            (scope.sessionId && auth?.websiteSessionId === scope.sessionId) ||
            (scope.userId && auth?.userId === scope.userId)
          ) {
            socket.disconnect(true);
          }
        }
      } catch {
        /* malformed notification cannot authorize a connection */
      }
    });
  }

  io.on("connection", async (socket: SocketWithAuth) => {
    Metrics.increment("websockets.connected");
    Metrics.gaugePerInstance("websockets.count", io.engine.clientsCount);

    // If the socket didn't authenticate after connection, disconnect it
    const authTimeout = setTimeout(function () {
      if (!socket.client.auth) {
        Logger.debug("websockets", `Disconnecting socket ${socket.id}`);

        // @ts-expect-error should be boolean
        socket.disconnect("unauthorized");
      }
    }, 1000);

    socket.on("disconnect", async () => {
      Metrics.increment("websockets.disconnected");
      Metrics.gaugePerInstance("websockets.count", io.engine.clientsCount);

      // Cancel the pending auth timeout, now we're disconnected
      clearTimeout(authTimeout);

      // Release the connection's auth reference so it isn't retained
      const lease = socket.client.auth?.lease;
      socket.client.auth = undefined;
      lease?.invalidate();
    });

    try {
      const user = await authenticate(socket);
      if (env.WEBSITE_INTEGRATION_ENABLED) {
        socket.use((_packet, next) => {
          try {
            socket.client.auth?.lease?.assertActive();
            next();
          } catch {
            socket.disconnect(true);
            next(new Error("Session expired"));
          }
        });
      }
      Logger.debug("websockets", `Authenticated socket ${socket.id}`);

      socket.emit("authenticated", true);
      void authenticated(io, socket, user).catch((err) => {
        Logger.error(
          "Failed to join rooms for authenticated socket",
          toError(err),
          {
            socketId: socket.id,
            userId: user.id,
          }
        );

        // The socket receives no events without its rooms, disconnect so that
        // the client reconnects and tries again.
        socket.disconnect();
      });
    } catch (err) {
      const message = errToString(err);
      Logger.debug("websockets", `Authentication error socket ${socket.id}`, {
        error: message,
      });
      socket.emit("unauthorized", { message, id: errToId(err) }, function () {
        socket.disconnect();
      });
    }
  });

  // Handle events from event queue that should be sent to the clients down ws
  const websockets = new WebsocketsProcessor();
  websocketQueue()
    .process(
      traceFunction({
        serviceName: "websockets",
        spanName: "process",
        isRoot: true,
      })(async function (job) {
        const event = job.data;

        Tracing.setResource(`Processor.WebsocketsProcessor`);

        websockets.perform(event, io).catch((error) => {
          Logger.error("Error processing websocket event", error, {
            event,
          });
        });
      })
    )
    .catch((err) => {
      Logger.fatal("Error starting websocketQueue", err);
    });
}

async function authenticated(
  io: IO.Server,
  socket: SocketWithAuth,
  user: User
) {
  // the rooms associated with the current team
  // and user so we can send authenticated events
  const rooms = [`team-${user.teamId}`, `user-${user.id}`];

  // the room of non-guest team members, who have access to all
  // team-visible collections.
  if (!user.isGuest) {
    rooms.push(`team-${user.teamId}.members`);
  }

  // the rooms associated with collections and groups this user
  // has access to on connection.
  const [collectionIds, groupIds] = await Promise.all([
    user.collectionIds(),
    user.groupIds(),
  ]);

  collectionIds.forEach((colId) => rooms.push(`collection-${colId}`));
  groupIds.forEach((groupId) => rooms.push(`group-${groupId}`));

  // join all of the rooms at once
  await socket.join(rooms);
}

/**
 * Authenticate the socket with the given token, returning the user model and
 * attaching lightweight auth identifiers for the lifetime of the connection.
 */
async function authenticate(socket: SocketWithAuth): Promise<User> {
  const cookies = socket.request.headers.cookie
    ? cookie.parse(socket.request.headers.cookie)
    : {};
  if (env.WEBSITE_INTEGRATION_ENABLED) {
    const token = cookies.exdocs_access;
    if (!token) {
      throw AuthenticationError("No integrated session");
    }
    const { user, session, websiteSubject } = await authenticateExternalToken(
      token,
      "website-session"
    );
    const lease = await websiteSessionGuard().openLease(
      { ...session.get(), websiteSubject },
      () => socket.disconnect(true)
    );
    socket.client.auth = {
      userId: user.id,
      teamId: user.teamId,
      websiteSessionId: session.websiteSessionId,
      lease,
    };
    return user;
  }
  const { accessToken } = cookies;

  if (!accessToken) {
    throw AuthenticationError("No access token");
  }

  const { user } = await getUserForJWT(accessToken);
  socket.client.auth = { userId: user.id, teamId: user.teamId };
  return user;
}
