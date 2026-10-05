// oxlint-disable-next-line import/no-unresolved
import "vite/modulepreload-polyfill";
// Keep ahead of the other imports so polyfills apply before they evaluate.
import "~/utils/polyfills";
// Registers the Outfit font faces declared by the ExUI package. Imported
// once here so the font is available to the application UI. Document content
// keeps Outline's existing system font stack.
import "@exre/exui/tokens/font.css";
import "@exre/exui/tokens/style.css";
import "@shared/styles/websiteTheme.css";
import { WebsiteThemePreferenceSync } from "~/components/WebsiteThemePreferenceSync";
import { WebsiteLanguageProjection } from "~/components/WebsiteLanguageProjection";
import { LazyMotion, domMax } from "framer-motion";
import { KBarProvider } from "kbar";
import { Provider } from "mobx-react";
import { configure as configureMobx } from "mobx";
import { StrictMode } from "react";
import { render } from "react-dom";
import { HelmetProvider } from "react-helmet-async";
import { Router } from "react-router-dom";
import stores from "~/stores";
import Analytics from "~/components/Analytics";
import Dialogs from "~/components/Dialogs";
import Presentation from "~/components/Presentation";
import ErrorBoundary from "~/components/ErrorBoundary";
import PageTheme from "~/components/PageTheme";
import ScrollToTop from "~/components/ScrollToTop";
import Theme from "~/components/Theme";
import Toasts from "~/components/Toasts";
import env from "~/env";
import { publicBasePath, publicPath } from "@shared/utils/publicPath";
import { initI18n } from "~/utils/i18n";
import Desktop from "./components/DesktopEventHandler";
import LazyPolyfill from "./components/LazyPolyfills";
import PageScroll from "./components/PageScroll";
import Routes from "./routes";
import Logger from "./utils/Logger";
import { PluginManager } from "./utils/PluginManager";
import history from "./utils/history";
import { initSentry } from "./utils/sentry";
import { initSplitViewNavigation } from "./utils/splitView";
import { ActionContextProvider } from "./hooks/useActionContext";

// Load plugins as soon as possible
void PluginManager.loadPlugins();

initI18n(env.DEFAULT_LANGUAGE);

// Register ahead of rendering so the capture-phase listeners run before any
// React-mounted listener, such as kbar's Enter handler.
initSplitViewNavigation(history);

const element = window.document.getElementById("root");

if (env.SENTRY_DSN) {
  initSentry(history);
}

configureMobx({
  // TODO: Enable these options and fix any resulting warnings
  // enforceActions: env.isDevelopment ? "always" : "never",
  computedRequiresReaction: true,
  isolateGlobalState: true,
});

const commandBarOptions = {
  animations: {
    enterMs: 250,
    exitMs: 200,
  },
};

if (element) {
  const App = () => (
    <StrictMode>
      <HelmetProvider>
        <Provider rootStore={stores}>
          <WebsiteThemePreferenceSync />
          <WebsiteLanguageProjection />
          <Analytics>
            <Router history={history}>
              <Theme>
                <ActionContextProvider>
                  <ErrorBoundary showTitle>
                    <KBarProvider actions={[]} options={commandBarOptions}>
                      <LazyPolyfill>
                        <LazyMotion features={domMax}>
                          <PageScroll>
                            <PageTheme />
                            <ScrollToTop>
                              <Routes />
                            </ScrollToTop>
                            <Toasts />
                            <Dialogs />
                            <Presentation />
                            <Desktop />
                          </PageScroll>
                        </LazyMotion>
                      </LazyPolyfill>
                    </KBarProvider>
                  </ErrorBoundary>
                </ActionContextProvider>
              </Theme>
            </Router>
          </Analytics>
        </Provider>
      </HelmetProvider>
    </StrictMode>
  );

  render(<App />, element);
}

window.addEventListener("load", async () => {
  // installation does not use Google Analytics, or tracking is blocked on client
  // no point loading the rest of the analytics bundles
  if (!env.GOOGLE_ANALYTICS_ID || !window.ga) {
    return;
  }
  await import("~/utils/autotrack");
  window.ga("require", "outboundLinkTracker");
  window.ga("require", "urlChangeTracker");
  window.ga("require", "eventTracker", {
    attributePrefix: "data-",
  });
});

// Skip registration on public share views, anonymous visitors gain nothing
// from having the app precached.
if (
  "serviceWorker" in navigator &&
  env.ENVIRONMENT !== "development" &&
  !env.isShare
) {
  window.addEventListener("load", () => {
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1097616
    // In some rare (<0.1% of cases) this call can return `undefined`
    const basePath = publicBasePath(env.URL);
    const maybePromise = navigator.serviceWorker.register(
      publicPath(basePath, "/static/sw.js"),
      {
        scope: `${basePath}/`,
      }
    );

    if (maybePromise?.then) {
      maybePromise
        .then((registration) => {
          Logger.debug(
            "lifecycle",
            "[ServiceWorker] Registered.",
            registration
          );
        })
        .catch((registrationError) => {
          Logger.debug(
            "lifecycle",
            "[ServiceWorker] Registration failed.",
            registrationError
          );
        });
    }
  });
}
