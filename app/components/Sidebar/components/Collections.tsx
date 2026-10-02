import { exuiTokens } from "@exre/exui/tokens";
import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { PlusIcon } from "@shared/components/LucideIcon";
import { s } from "@shared/styles";
import type Collection from "~/models/Collection";
import Flex from "~/components/Flex";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import NudeButton from "~/components/NudeButton";
import { createCollection } from "~/actions/definitions/collections";
import useStores from "~/hooks/useStores";
import type { DragObject } from "../hooks/useDragAndDrop";
import DraggableCollectionLink from "./DraggableCollectionLink";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import Text from "@shared/components/Text";
import usePolicy from "~/hooks/usePolicy";

function Collections() {
  const { documents, auth, collections, policies } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(auth.team?.id);
  const orderedCollections = collections.allActive;

  const params = useMemo(
    () => ({
      limit: 100,
    }),
    []
  );

  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
    accept: "collection",
    drop: async (item: DragObject) => {
      void collections.move(
        item.id,
        fractionalIndex(null, orderedCollections[0].index)
      );
    },
    canDrop: (item) =>
      item.id !== orderedCollections[0]?.id &&
      !!policies.abilities(item.id).move,
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
      isDraggingAnyCollection: monitor.canDrop(),
    }),
  });

  return (
    <SidebarContext.Provider value="collections">
      <Flex column>
        <Header
          id="collections"
          title={t("Collections")}
          collapsible={false}
          actions={
            <CreateButton
              action={createCollection}
              hideOnActionDisabled
              aria-label={t("New collection")}
              tooltip={{ content: t("New collection") }}
            >
              <PlusIcon aria-hidden />
            </CreateButton>
          }
        >
          <Relative>
            <PaginatedList<Collection>
              options={params}
              aria-label={t("Collections")}
              items={orderedCollections}
              loading={<PlaceholderCollections />}
              heading={
                isDraggingAnyCollection ? (
                  <DropCursor
                    isActiveDrop={isCollectionDropping}
                    innerRef={dropToReorderCollection}
                    position="top"
                  />
                ) : undefined
              }
              empty={
                // The heading already offers a create action when permitted.
                can.createCollection ? null : (
                  <SidebarLink
                    label={
                      <Text type="tertiary" size="small" italic>
                        {t("No collections")}
                      </Text>
                    }
                    onClick={() => {}}
                    depth={1.5}
                  />
                )
              }
              renderError={(props) => <StyledError {...props} />}
              renderItem={(item, index) => (
                <DraggableCollectionLink
                  key={item.id}
                  collection={item}
                  activeDocument={documents.active}
                  belowCollection={orderedCollections[index + 1]}
                />
              )}
            />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
}

export const StyledError = styled(Error)`
  font-size: ${exuiTokens.typography.bodyFontSize};
  padding: 0 8px;
`;

const CreateButton = styled(NudeButton)`
  flex-shrink: 0;
  margin-inline-end: 8px;
  color: ${s("textTertiary")};

  @media (hover: hover) {
    opacity: 0;
    pointer-events: none;

    #sidebar:hover &,
    &:focus-visible {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &:hover {
    background: ${s("sidebarHoverBackground")};
  }
`;

export default observer(Collections);
