import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// SSL_CERT_FILE is OpenSSL's CA bundle variable and may be present in the
// host environment running the tests; clear it so it is not resolved into
// Outline's SSL_CERT setting. The config is evaluated before the global setup
// and before workers spawn, so this covers every test process.
delete process.env.SSL_CERT_FILE;

const aliases = {
  "@server": path.resolve(__dirname, "./server"),
  "@shared": path.resolve(__dirname, "./shared"),
  "~": path.resolve(__dirname, "./app"),
  plugins: path.resolve(__dirname, "./plugins"),
};

const fileMock = path.resolve(__dirname, "./__mocks__/fileMock.js");

// Mirrors the server build's SWC config (.swcrc). `decoratorMetadata` stays off
// because every @Column has an explicit DataType, and emitting it would throw
// on the circular model graph; `useDefineForClassFields:false` keeps bare class
// fields from shadowing MobX observables. `tsconfigFile:false` stops the plugin
// re-deriving (and re-enabling metadata) from tsconfig.json.
const swcPlugin = () =>
  swc.vite({
    tsconfigFile: false,
    jsc: {
      parser: { syntax: "typescript", tsx: true, decorators: true },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: false,
        useDefineForClassFields: false,
        react: { runtime: "automatic" },
      },
      keepClassNames: true,
      target: "es2020",
    },
    // Preserve ES module syntax so Vite resolves imports (e.g. ./rules → .ts).
    module: { type: "es6" },
  });

const sharedConfig = {
  resolve: { alias: aliases },
  plugins: [swcPlugin()],
  esbuild: false as const,
  oxc: false as const,
};

const aliasesAsArray = Object.entries(aliases).map(([find, replacement]) => ({
  find,
  replacement,
}));

const fileMockAlias = { find: /\.(gif|ttf|eot|svg)$/, replacement: fileMock };

export default defineConfig({
  ...sharedConfig,
  test: {
    globals: true,
    pool: "threads",
    // Unhandled promise rejections are logged but don't fail tests on their own.
    dangerouslyIgnoreUnhandledErrors: true,
    projects: [
      {
        ...sharedConfig,
        test: {
          name: "server",
          globals: true,
          environment: "node",
          include: ["server/**/*.test.{ts,tsx}", "plugins/**/*.test.{ts,tsx}"],
          setupFiles: [
            "./__mocks__/console.js",
            "./server/test/setupMocks.ts",
            "./server/test/setup.ts",
          ],
          globalSetup: ["./server/test/globalTeardown.ts"],
          fileParallelism: true,
        },
      },
      {
        ...sharedConfig,
        resolve: { alias: [fileMockAlias, ...aliasesAsArray] },
        test: {
          name: "app",
          globals: true,
          environment: "jsdom",
          environmentOptions: {
            jsdom: { url: "http://localhost" },
          },
          include: ["app/**/*.test.{ts,tsx}"],
          exclude: ["app/**/*.vrt.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/window.js", "./app/test/setup.ts"],
          server: {
            deps: {
              inline: [
                /@radix-ui/,
                "vaul",
                "react-dnd",
                "react-dnd-html5-backend",
              ],
            },
          },
        },
      },
      {
        ...sharedConfig,
        resolve: { alias: [fileMockAlias, ...aliasesAsArray] },
        server: {
          fs: {
            allow: [
              path.resolve(__dirname),
              path.resolve(__dirname, "../../exui"),
            ],
          },
        },
        optimizeDeps: {
          include: [
            "react/jsx-runtime",
            "react-portal",
            "copy-to-clipboard",
            "react-colorful",
            "react-day-picker",
            "@radix-ui/react-switch",
            "@radix-ui/react-select",
          ],
        },
        test: {
          name: "visual",
          globals: true,
          include: ["app/**/*.vrt.test.{ts,tsx}"],
          setupFiles: ["./app/test/visualEnv.ts", "./app/test/visualSetup.ts"],
          fileParallelism: false,
          api: { allowWrite: true },
          browser: {
            enabled: true,
            headless: true,
            screenshotDirectory: "./app/test",
            screenshotFailures: false,
            api: { allowWrite: true },
            expect: {
              toMatchScreenshot: {
                resolveScreenshotPath: ({
                  arg,
                  ext,
                  root,
                  screenshotDirectory,
                }) => path.resolve(root, screenshotDirectory, `${arg}${ext}`),
              },
            },
            provider: playwright({
              contextOptions: {
                deviceScaleFactor: 1,
                locale: "en-US",
                reducedMotion: "reduce",
                timezoneId: "UTC",
              },
            }),
            instances: [
              {
                browser: "chromium",
                name: "chromium-desktop",
                viewport: { width: 1280, height: 900 },
              },
              {
                browser: "chromium",
                name: "chromium-mobile",
                viewport: { width: 390, height: 844 },
              },
            ],
          },
        },
      },
      {
        ...sharedConfig,
        test: {
          name: "shared-node",
          globals: true,
          environment: "node",
          include: ["shared/**/*.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/console.js", "./shared/test/setup.ts"],
        },
      },
      {
        ...sharedConfig,
        resolve: { alias: [fileMockAlias, ...aliasesAsArray] },
        test: {
          name: "shared-jsdom",
          globals: true,
          environment: "jsdom",
          environmentOptions: {
            jsdom: { url: "http://localhost" },
          },
          include: ["shared/**/*.test.{ts,tsx}"],
          setupFiles: ["./__mocks__/window.js"],
        },
      },
    ],
  },
});
