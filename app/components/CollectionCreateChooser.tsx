import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import { newDocumentPath } from "~/utils/routeHelpers";

/** An integrated workspace must choose an authorized collection before creating a draft. */
export const CollectionCreateChooser = observer(
  function CollectionCreateChooser() {
    const { collections, policies } = useStores();
    const [state, setState] = useState<"loading" | "ready" | "error">(
      "loading"
    );
    useEffect(() => {
      let current = true;
      void collections.fetchAll().then(
        () => {
          if (current) {
            setState("ready");
          }
        },
        () => {
          if (current) {
            setState("error");
          }
        }
      );
      return () => {
        current = false;
      };
    }, [collections]);
    const editable = collections.allActive.filter(
      (collection) => policies.abilities(collection.id).createDocument
    );
    return (
      <ChooserMain>
        <h1>Choose a collection</h1>
        {state === "loading" ? (
          <p role="status">Loading collections…</p>
        ) : state === "error" ? (
          <p role="alert">
            Collections are temporarily unavailable. Refresh to retry.
          </p>
        ) : editable.length ? (
          <ul>
            {editable.map((collection) => (
              <li key={collection.id}>
                <Link to={newDocumentPath(collection.id)}>
                  {collection.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>You do not have access to create documents in any collection.</p>
        )}
      </ChooserMain>
    );
  }
);

const ChooserMain = styled.main`
  max-width: 640px;
  margin: 2rem auto;
`;
