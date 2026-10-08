import { shouldAutoDeleteDraftOnUnmount } from "./useDocumentSave";

describe("shouldAutoDeleteDraftOnUnmount", () => {
  const baseOptions = {
    title: "",
    createdById: "user-1",
    currentUserId: "user-1",
    isDraft: true,
    isActive: true,
    hasEmptyTitle: true,
    isPersistedOnce: true,
  };

  it("does not auto delete drafts with non-empty editor content", () => {
    expect(
      shouldAutoDeleteDraftOnUnmount({
        ...baseOptions,
        isEditorEmpty: false,
      })
    ).toBe(false);
  });

  it("auto deletes drafts that are still empty and untitled", () => {
    expect(
      shouldAutoDeleteDraftOnUnmount({
        ...baseOptions,
        isEditorEmpty: true,
      })
    ).toBe(true);
  });
});

import { createElement } from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { useDocumentSave } from "./useDocumentSave";
import { Schema } from "prosemirror-model";
import type { Editor as TEditor } from "~/editor";
import type DocumentsStore from "~/stores/DocumentsStore";
import User from "~/models/User";
import type UsersStore from "~/stores/UsersStore";
import Document from "~/models/Document";
const guard = vi.hoisted(() => ({
  auth: {
    logoutPending: false,
    websiteIntegrationEnabled: true,
    sessionGeneration: 1,
    user: { id: "user-1" },
  },
}));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({ auth: guard.auth, ui: {} }),
}));
vi.mock("~/hooks/useLocationSidebarContext", () => ({
  useLocationSidebarContext: () => undefined,
}));
it("skips explicit, delayed and unmount draft writes while logout is pending", async () => {
  const document = new Document({ title: "old" }, {} as DocumentsStore);
  vi.spyOn(document, "createdBy", "get").mockReturnValue(undefined);
  const save = vi.spyOn(document, "save").mockResolvedValue(document);
  const remove = vi.spyOn(document, "delete").mockResolvedValue(undefined);
  vi.spyOn(document, "isDirty").mockReturnValue(true);
  let callbacks: ReturnType<typeof useDocumentSave> | undefined;
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("body")]),
  ]);
  const editor = { view: { state: { doc } } } as TEditor;
  function Harness() {
    callbacks = useDocumentSave({
      document,
      editorRef: { current: editor },
      readOnly: false,
    });
    return null;
  }
  vi.useFakeTimers();
  const view = render(
    createElement(MemoryRouter, null, createElement(Harness))
  );
  act(() => callbacks?.handleChangeTitle("queued"));
  guard.auth.logoutPending = true;
  await act(async () => {
    await callbacks?.onSave();
    await vi.advanceTimersByTimeAsync(3500);
  });
  view.unmount();
  expect(save).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
  guard.auth.logoutPending = false;
  vi.useRealTimers();
});

it("skips deletion of an empty persisted draft on unmount while logout is pending", () => {
  const document = new Document(
    { id: "draft", title: "", createdById: "user-1" },
    {} as DocumentsStore
  );
  const user = new User({ id: "user-1" }, {} as UsersStore);
  vi.spyOn(document, "createdBy", "get").mockReturnValue(user);
  const remove = vi.spyOn(document, "delete").mockResolvedValue(undefined);
  const save = vi.spyOn(document, "save").mockResolvedValue(document);
  function Harness() {
    useDocumentSave({
      document,
      editorRef: { current: null },
      readOnly: false,
    });
    return null;
  }
  const view = render(
    createElement(MemoryRouter, null, createElement(Harness))
  );
  guard.auth.logoutPending = true;
  view.unmount();
  expect(remove).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  guard.auth.logoutPending = false;
});

it("rejects old editor saves and unmount writes after a new same-user verified session", async () => {
  const document = new Document(
    { id: "draft", title: "old" },
    {} as DocumentsStore
  );
  const save = vi.spyOn(document, "save").mockResolvedValue(document);
  vi.spyOn(document, "isDirty").mockReturnValue(true);
  let callbacks: ReturnType<typeof useDocumentSave> | undefined;
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text("body")]),
  ]);
  const editor = { view: { state: { doc } } } as TEditor;
  function Harness() {
    callbacks = useDocumentSave({
      document,
      editorRef: { current: editor },
      readOnly: false,
    });
    return null;
  }
  const view = render(
    createElement(MemoryRouter, null, createElement(Harness))
  );
  guard.auth.sessionGeneration += 1;
  await act(async () => {
    await callbacks?.onSave();
  });
  view.unmount();
  expect(save).not.toHaveBeenCalled();
  guard.auth.sessionGeneration = 1;
});
