import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import WebSocket from "ws";
import viteConfig from "./vite.config";

it("serves CSS hot updates after a linked package rebuild replaces its dist directory", async () => {
  const fixture = await mkdtemp(path.resolve(".vite-rebuild-test-"));
  const root = path.join(fixture, "app");
  const dist = path.join(fixture, "exui", "dist", "tokens");
  const font = path.join(dist, "font.css");
  const fontUrl = `/static/@fs/${font.split("\\").join("/")}`;
  const config = viteConfig({ command: "serve", mode: "development" });
  let server: ViteDevServer | undefined;
  let socket: WebSocket | undefined;

  try {
    await mkdir(root, { recursive: true });
    await mkdir(dist, { recursive: true });
    await writeFile(font, "body { color: red; }");
    await writeFile(
      path.join(root, "entry.js"),
      `import ${JSON.stringify(font)};`
    );

    server = await createServer({
      configFile: false,
      root,
      cacheDir: path.join(fixture, "cache"),
      base: "/static/",
      logLevel: "silent",
      server: {
        port: 0,
        fs: { allow: [fixture] },
        watch: config.server?.watch,
      },
    });
    await server.listen();
    const localUrl = server.resolvedUrls?.local[0];
    assert.ok(localUrl);
    const origin = localUrl.replace(/\/static\/$/, "");

    expect((await fetch(`${origin}/static/entry.js`)).status).toBe(200);
    expect((await fetch(`${origin}${fontUrl}`)).status).toBe(200);

    const connection = new WebSocket(
      origin.replace("http:", "ws:") + "/static/",
      "vite-hmr"
    );
    socket = connection;
    const hotUpdate = new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        connection.on("message", (data) => {
          const message: { type: string } = JSON.parse(data.toString());
          if (message.type !== "update" && message.type !== "full-reload") {
            return;
          }
          fetch(`${origin}${fontUrl}?t=${Date.now()}`)
            .then(async (response) => ({
              status: response.status,
              body: await response.text(),
            }))
            .then(resolve, reject);
        });
        connection.once("error", reject);
      }
    );
    await new Promise<void>((resolve, reject) => {
      connection.once("open", resolve);
      connection.once("error", reject);
    });
    await delay(250);

    // Model the real ExUI build: delete the containing directory, then copy
    // its artifacts back after the default 100ms atomic-write window.
    await rm(dist, { recursive: true });
    await delay(500);
    await mkdir(dist, { recursive: true });
    await writeFile(font, "body { color: blue; }");

    const update = await hotUpdate;
    expect(update.status).toBe(200);
    expect(update.body).toContain("color: blue");
  } finally {
    socket?.close();
    await server?.close();
    await rm(fixture, { recursive: true, force: true });
  }
}, 10000);

it("does not reload the page when a linked package rebuild writes identical artifacts", async () => {
  const fixture = await mkdtemp(path.resolve(".vite-rebuild-test-"));
  const root = path.join(fixture, "app");
  const dist = path.join(fixture, "exui", "dist", "tokens");
  const tokens = path.join(dist, "tokens.js");
  const content = "export const color = 'red';";
  const config = viteConfig({ command: "serve", mode: "development" });
  let server: ViteDevServer | undefined;
  let socket: WebSocket | undefined;

  try {
    await mkdir(root, { recursive: true });
    await mkdir(dist, { recursive: true });
    await writeFile(tokens, content);
    await writeFile(
      path.join(root, "entry.js"),
      `import ${JSON.stringify(tokens)};`
    );
    server = await createServer({
      configFile: false,
      root,
      cacheDir: path.join(fixture, "cache"),
      base: "/static/",
      logLevel: "silent",
      server: {
        port: 0,
        fs: { allow: [fixture] },
        watch: config.server?.watch,
      },
    });
    await server.listen();
    const localUrl = server.resolvedUrls?.local[0];
    assert.ok(localUrl);
    const origin = localUrl.replace(/\/static\/$/, "");
    const tokensUrl = `/static/@fs/${tokens.split("\\").join("/")}`;
    expect((await fetch(`${origin}/static/entry.js`)).status).toBe(200);
    expect((await fetch(`${origin}${tokensUrl}`)).status).toBe(200);

    const connection = new WebSocket(
      origin.replace("http:", "ws:") + "/static/",
      "vite-hmr"
    );
    socket = connection;
    const reloads: string[] = [];
    connection.on("message", (data) => {
      const message: { type: string; path?: string } = JSON.parse(
        data.toString()
      );
      if (message.type === "full-reload") {
        reloads.push(message.path ?? "*");
      }
    });
    await new Promise<void>((resolve, reject) => {
      connection.once("open", resolve);
      connection.once("error", reject);
    });
    await delay(250);
    await rm(dist, { recursive: true });
    await delay(500);
    await mkdir(dist, { recursive: true });
    await writeFile(tokens, content);
    await delay(5500);

    expect(
      reloads,
      "an unchanged ExUI rebuild must not refresh an idle page"
    ).toEqual([]);
  } finally {
    socket?.close();
    await server?.close();
    await rm(fixture, { recursive: true, force: true });
  }
}, 10000);
