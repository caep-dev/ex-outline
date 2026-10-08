// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicOnlyGate from "./PublicOnlyGate";

import type { ReactElement } from "react";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { renderWithTheme } from "~/test/renderWithTheme";
const post = vi.hoisted(() => vi.fn());
const scope = vi.hoisted(() => ({ generation: 0 }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({ publicDocs: scope }),
}));
vi.mock("~/utils/ApiClient", () => ({ client: { fetch: post } }));
vi.mock("~/scenes/WebsitePublic", () => ({
  PublicDocumentView: () => <p>Safe public reader</p>,
}));

beforeEach(() => {
  post.mockReset();
  scope.generation = 0;
});
afterEach(() => cleanup());

describe("integrated document access gate", () => {
  it("routes a public-only response to the safe reader without mounting private document effects", async () => {
    post.mockResolvedValue({
      publicOnly: true,
      data: { document: { id: "doc-1" } },
    });
    render(
      <PublicOnlyGate documentSlug="public-slug">
        <p>Private document effects</p>
      </PublicOnlyGate>
    );
    expect(await screen.findByText("Safe public reader")).toBeTruthy();
    expect(screen.queryByText("Private document effects")).toBeNull();
    expect(post).toHaveBeenCalledWith("/documents.info", "POST", {
      id: "public-slug",
    });
  });

  it("mounts the existing document scene only after a normal access response", async () => {
    post.mockResolvedValue({ data: { document: { id: "member-doc" } } });
    render(
      <PublicOnlyGate documentSlug="member-slug">
        <p>Private document effects</p>
      </PublicOnlyGate>
    );
    expect(screen.queryByText("Private document effects")).toBeNull();
    expect(await screen.findByText("Private document effects")).toBeTruthy();
  });

  it("hides previously authorized content while a new document check is pending", async () => {
    let resolveNext: ((value: unknown) => void) | undefined;
    post
      .mockResolvedValueOnce({ data: { document: { id: "member-doc" } } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNext = resolve;
          })
      );
    const view = render(
      <PublicOnlyGate documentSlug="member-slug">
        <p>Private document effects</p>
      </PublicOnlyGate>
    );
    expect(await screen.findByText("Private document effects")).toBeTruthy();
    view.rerender(
      <PublicOnlyGate documentSlug="other-slug">
        <p>Private document effects</p>
      </PublicOnlyGate>
    );
    expect(screen.queryByText("Private document effects")).toBeNull();
    resolveNext?.({
      publicOnly: true,
      data: { document: { id: "other-doc" } },
    });
    expect(await screen.findByText("Safe public reader")).toBeTruthy();
  });

  it("keeps errors visible and retries without showing cached content", async () => {
    post.mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce({
      publicOnly: true,
      data: { document: { id: "public-doc" } },
    });
    render(
      <PublicOnlyGate documentSlug="public-slug">
        <p>Private document effects</p>
      </PublicOnlyGate>
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "temporarily unavailable"
    );
    expect(screen.queryByText("Private document effects")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Safe public reader")).toBeTruthy();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  });
});

it("unmounts authorized content immediately on identity change and ignores the late member answer", async () => {
  let complete: ((value: object) => void) | undefined;
  post
    .mockResolvedValueOnce({ data: { document: { id: "old" } } })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        })
    );
  const view = render(
    <PublicOnlyGate documentSlug="same">
      <p>Member effect</p>
    </PublicOnlyGate>
  );
  expect(await screen.findByText("Member effect")).toBeTruthy();
  scope.generation = 1;
  view.rerender(
    <PublicOnlyGate documentSlug="same">
      <p>Member effect</p>
    </PublicOnlyGate>
  );
  expect(screen.queryByText("Member effect")).toBeNull();
  scope.generation = 2;
  post.mockResolvedValueOnce({
    publicOnly: true,
    data: { document: { id: "new" } },
  });
  view.rerender(
    <PublicOnlyGate documentSlug="same">
      <p>Member effect</p>
    </PublicOnlyGate>
  );
  complete?.({ data: { document: { id: "stale" } } });
  expect(await screen.findByText("Safe public reader")).toBeTruthy();
  expect(screen.queryByText("Member effect")).toBeNull();
});

function render(node: ReactElement) {
  const view = renderWithTheme(node);
  return {
    ...view,
    rerender: (next: ReactElement) =>
      view.rerender(<ThemeProvider theme={light}>{next}</ThemeProvider>),
  };
}
