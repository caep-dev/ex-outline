/* oxlint-disable no-console */
/* oxlint-disable @typescript-oxlint/no-var-requires */
/* oxlint-disable no-undef */
const { exec } = require("child_process");
const { readdirSync, existsSync } = require("fs");
const { copyFile, mkdir, rm } = require("fs/promises");
const path = require("path");

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout ? stdout : stderr);
      }
    });
  });
}

/**
 * Copies a file when it exists, creating its destination directory first.
 * @param source {string}
 * @param destination {string}
 * @return {Promise<void>}
 */
async function copyFileIfExists(source, destination) {
  if (!existsSync(source)) {
    return;
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function build() {
  // Clean previous build
  console.log("Clean previous build…");

  await Promise.all([
    rm("./build/server", { recursive: true, force: true }),
    rm("./build/plugins", { recursive: true, force: true }),
  ]);

  const d = getDirectories("./plugins");

  // Compile server and shared
  console.log("Compiling…");
  const swc = (src, out) =>
    execAsync(
      `yarn swc "${src}" -d "${out}" --strip-leading-paths --extensions .ts,.tsx --ignore "**/*.test.ts,**/*.test.tsx,**/__mocks__/**" --quiet`
    );

  await Promise.all([
    swc("./server", "./build/server"),
    swc("./shared", "./build/shared"),
  ]);

  // SWC's --strip-leading-paths removes only the topmost path segment, so a
  // `plugins/<name>/server` input keeps `<name>/server/…` and lands correctly
  // under a `./build/plugins` output directory.
  for (const plugin of d) {
    const hasServer = existsSync(`./plugins/${plugin}/server`);

    if (hasServer) {
      await swc(`./plugins/${plugin}/server`, "./build/plugins");
    }

    const hasShared = existsSync(`./plugins/${plugin}/shared`);

    if (hasShared) {
      await swc(`./plugins/${plugin}/shared`, "./build/plugins");
    }
  }

  // Copy static files
  console.log("Copying static files…");
  await Promise.all([
    copyFileIfExists(
      "./server/collaboration/Procfile",
      "./build/server/collaboration/Procfile"
    ),
    copyFileIfExists(
      "./server/static/error.dev.html",
      "./build/server/error.dev.html"
    ),
    copyFileIfExists(
      "./server/static/error.prod.html",
      "./build/server/error.prod.html"
    ),
    copyFileIfExists("./package.json", "./build/package.json"),
    ...d.map(async (plugin) =>
      copyFileIfExists(
        `./plugins/${plugin}/plugin.json`,
        `./build/plugins/${plugin}/plugin.json`
      )
    ),
  ]);

  console.log("Done!");
}

void build();
