// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionCreateChooser } from "./CollectionCreateChooser";

const mocks = vi.hoisted(() => ({
  collections: {
    fetchAll: vi.fn(),
    allActive: [
      { id: "read-only", name: "Read only" },
      { id: "editable", name: "Editable" },
    ],
  },
  abilities: vi.fn((id: string) => ({ createDocument: id === "editable" })),
}));

vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    collections: mocks.collections,
    policies: { abilities: mocks.abilities },
  }),
}));

beforeEach(() => {
  mocks.collections.fetchAll.mockReset().mockResolvedValue(undefined);
  mocks.abilities.mockReset().mockImplementation((id: string) => ({
    createDocument: id === "editable",
  }));
});
afterEach(() => cleanup());

describe("integrated collection chooser", () => {
  it("offers only collections with createDocument permission and supplies its id", async () => {
    render(
      <MemoryRouter>
        <CollectionCreateChooser />
      </MemoryRouter>
    );
    const link = await screen.findByRole("link", { name: "Editable" });
    expect(link).toHaveAttribute("href", "/collection/editable/new");
    expect(screen.queryByRole("link", { name: "Read only" })).toBeNull();
  });

  it("explains when no collection is editable", async () => {
    mocks.abilities.mockImplementation(() => ({ createDocument: false }));
    render(
      <MemoryRouter>
        <CollectionCreateChooser />
      </MemoryRouter>
    );
    expect(
      await screen.findByText(/do not have access to create documents/)
    ).toBeTruthy();
  });
});
