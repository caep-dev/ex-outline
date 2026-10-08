import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NavigationNode } from "@shared/types";
import { NavigationNodeType } from "@shared/types";
import Document from "~/models/Document";
import type DocumentsStore from "~/stores/DocumentsStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import DocumentPublish from "./DocumentPublish";

const mocks = vi.hoisted(() => ({
  auth: {
    logoutPending: false,
    sessionGeneration: 1,
    websiteIntegrationEnabled: true,
  },
  close: vi.fn(),
  submit: undefined as
    | ((path: NavigationNode | null) => Promise<void>)
    | undefined,
  items: [] as NavigationNode[],
  collection: {
    id: "collection",
    collectionId: "collection",
    title: "Location",
    url: "/collection",
    type: "collection",
    children: [],
  } as NavigationNode,
}));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    auth: mocks.auth,
    dialogs: { closeAllModals: mocks.close },
    policies: {
      get: () => ({ abilities: { createDocument: true } }),
      abilities: () => ({ createDocument: !mocks.auth.logoutPending }),
    },
  }),
}));
vi.mock("~/hooks/useCollectionTrees", () => ({
  default: () => [mocks.collection],
}));
vi.mock("~/components/DocumentExplorer", () => ({
  default: ({
    onSubmit,
    onSelect,
    items,
  }: {
    onSubmit: typeof mocks.submit;
    onSelect: (path: NavigationNode) => void;
    items: NavigationNode[];
  }) => {
    mocks.submit = onSubmit;
    mocks.items = items;
    return (
      <button onClick={() => onSelect(mocks.collection)}>
        Select location
      </button>
    );
  },
}));
beforeEach(() => {
  mocks.auth = observable({
    logoutPending: false,
    sessionGeneration: 1,
    websiteIntegrationEnabled: true,
  });
  mocks.close.mockClear();
});
afterEach(cleanup);

function model() {
  const document = new Document({ title: "Draft" }, {} as DocumentsStore);
  const move = vi.spyOn(document, "move").mockResolvedValue(undefined);
  const save = vi.spyOn(document, "save").mockResolvedValue(document);
  return { document, move, save };
}

it("disables an already-open modal and blocks its stale submit callback, then restores publishing after logout failure", async () => {
  const { document, move, save } = model();
  renderWithTheme(<DocumentPublish document={document} />);
  fireEvent.click(screen.getByRole("button", { name: "Select location" }));
  const submit = mocks.submit;
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = true;
    })
  );
  expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  expect(mocks.items).toEqual([]);
  await act(async () => {
    await submit?.({ ...mocks.collection, type: NavigationNodeType.Document });
  });
  expect(move).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = false;
    })
  );
  expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  expect(mocks.items).toHaveLength(1);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  });
  expect(save).toHaveBeenCalledWith(undefined, { publish: true });
  expect(mocks.close).toHaveBeenCalledOnce();
});

it.each(["pending", "new session"])(
  "does not save after move when %s begins during the request",
  async (change) => {
    const { document, move, save } = model();
    let resolveMove: (() => void) | undefined;
    move.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveMove = resolve;
        })
    );
    renderWithTheme(<DocumentPublish document={document} />);
    let publishing: Promise<void> | undefined;
    act(() => {
      publishing = mocks.submit?.({
        ...mocks.collection,
        type: NavigationNodeType.Document,
      });
    });
    expect(move).toHaveBeenCalledOnce();
    await act(async () => {
      runInAction(() => {
        if (change === "pending") {
          mocks.auth.logoutPending = true;
        } else {
          mocks.auth.sessionGeneration++;
        }
      });
      resolveMove?.();
      await publishing;
    });
    expect(save).not.toHaveBeenCalled();
    expect(mocks.close).not.toHaveBeenCalled();
  }
);

it("rejects old modal callbacks after a new same-user session", async () => {
  const { document, move, save } = model();
  renderWithTheme(<DocumentPublish document={document} />);
  const submit = mocks.submit;
  act(() =>
    runInAction(() => {
      mocks.auth.sessionGeneration++;
    })
  );
  await act(async () => {
    await submit?.(mocks.collection);
  });
  expect(move).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
