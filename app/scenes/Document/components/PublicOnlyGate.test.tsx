// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicOnlyGate from "./PublicOnlyGate";

const post = vi.hoisted(() => vi.fn());
vi.mock("~/utils/ApiClient", () => ({ client: { post } }));
vi.mock("~/scenes/WebsitePublic", () => ({
  PublicDocumentView: () => <p>Safe public reader</p>,
}));

beforeEach(() => post.mockReset());
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
    expect(post).toHaveBeenCalledWith("/documents.info", { id: "public-slug" });
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
      "Document unavailable"
    );
    expect(screen.queryByText("Private document effects")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Safe public reader")).toBeTruthy();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
  });
});
