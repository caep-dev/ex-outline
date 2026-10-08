import { observer } from "mobx-react";
import { Suspense } from "react";
import type { RouteComponentProps } from "react-router-dom";
import { Switch, Redirect } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Errors/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import { SplitView } from "~/components/SplitView";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import usePolicy from "~/hooks/usePolicy";
import useQueryNotices from "~/hooks/useQueryNotices";
import useKeyboardShortcutsQuery from "~/hooks/useKeyboardShortcutsQuery";
import lazy from "~/utils/lazyWithRetry";
import * as Scenes from "./scenes";
import {
  archivePath,
  draftsPath,
  homePath,
  searchPath,
  settingsPath,
  matchDocumentSlug as documentSlug,
  matchCollectionSlug as collectionSlug,
  trashPath,
  debugPath,
} from "~/utils/routeHelpers";
import env from "~/env";

const SettingsRoutes = lazy(() => import("./settings"));
const Debug = lazy(() => import("~/scenes/Developer/Debug"));
const Changesets = lazy(() => import("~/scenes/Developer/Changesets"));

const RedirectDocument = ({
  match,
}: RouteComponentProps<{ documentSlug: string }>) => (
  <Redirect
    to={
      match.params.documentSlug
        ? `/doc/${match.params.documentSlug}`
        : homePath()
    }
  />
);

/**
 * The authenticated routes are all the routes of the application that require
 * the user to be logged in.
 */
function AuthenticatedRoutes() {
  useQueryNotices();
  useKeyboardShortcutsQuery();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { auth, collections, policies } = useStores();
  const canCreateAny = auth.websiteIntegrationEnabled
    ? collections.allActive.some(
        (collection) => policies.abilities(collection.id).createDocument
      )
    : can.createDocument;

  return (
    <WebsocketProvider>
      <AuthenticatedLayout>
        <Suspense fallback={<FullscreenLoading />}>
          <SplitView>
            <Switch>
              {canCreateAny && (
                <Route
                  exact
                  path={draftsPath()}
                  component={Scenes.Drafts.Component}
                />
              )}
              {canCreateAny && (
                <Route
                  exact
                  path={archivePath()}
                  component={Scenes.Archive.Component}
                />
              )}
              {canCreateAny && (
                <Route
                  exact
                  path={trashPath()}
                  component={Scenes.Trash.Component}
                />
              )}
              <Route
                path={`${homePath()}/:tab?`}
                component={Scenes.Home.Component}
              />
              <Redirect from="/dashboard" to={homePath()} />
              <Redirect exact from="/starred" to={homePath()} />
              <Redirect
                exact
                from="/templates"
                to={settingsPath("templates")}
              />
              <Redirect exact from="/collections/*" to="/collection/*" />
              <Route
                exact
                path={`/collection/${collectionSlug}/new`}
                component={DocumentNew}
              />
              {(!auth.websiteIntegrationEnabled || auth.user?.isAdmin) && (
                <Route
                  exact
                  path={`/collection/${collectionSlug}/overview/edit`}
                  component={Scenes.Collection.Component}
                />
              )}
              <Route
                exact
                path={`/collection/${collectionSlug}/:tab?`}
                component={Scenes.Collection.Component}
              />
              <Route exact path="/doc/new" component={DocumentNew} />
              <Route
                exact
                path={`/d/${documentSlug}`}
                component={RedirectDocument}
              />
              <Route
                exact
                path={`/doc/${documentSlug}/history/:revisionId?`}
                component={Scenes.Document.Component}
              />

              <Route
                exact
                path={`/doc/${documentSlug}/edit`}
                component={Scenes.Document.Component}
              />
              <Route
                path={`/doc/${documentSlug}`}
                component={Scenes.Document.Component}
              />
              <Route
                exact
                path={`${searchPath()}/:query?`}
                component={Scenes.Search.Component}
              />
              {env.isDevelopment && (
                <Route exact path={debugPath()} component={Debug} />
              )}
              {env.isDevelopment && (
                <Route
                  exact
                  path={`${debugPath()}/changesets`}
                  component={Changesets}
                />
              )}
              <Route exact path="/404" component={Error404} />
              <SettingsRoutes />
              <Route component={Error404} />
            </Switch>
          </SplitView>
        </Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}

export default observer(AuthenticatedRoutes);
