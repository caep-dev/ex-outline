/* oxlint-disable no-console -- the visual harness captures browser console errors */
import { CloseIcon } from "outline-icons";
import type { ReactElement } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import styled, { ThemeProvider } from "styled-components";
import type { DefaultTheme } from "styled-components";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import GlobalStyles from "@shared/styles/globals";
import Button from "~/components/Button";
import Input from "~/components/Input";
import Modal from "~/components/Modal";
import SidebarLink from "~/components/Sidebar/components/SidebarLink";
import { Tab } from "~/components/Tabs/Tab";
import { Tabs } from "~/components/Tabs/Tabs";
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuSeparator,
  MenuTrigger,
} from "~/components/primitives/Menu";

interface ThemeCase {
  name: "light" | "dark" | "pitch-black";
  theme: DefaultTheme;
}

interface VisualIssue {
  message: string;
}

const themeCases: ThemeCase[] = [
  { name: "light", theme: buildLightTheme() },
  { name: "dark", theme: buildDarkTheme() },
  { name: "pitch-black", theme: buildPitchBlackTheme() },
];

const Canvas = styled.main`
  width: min(760px, calc(100vw - 32px));
  padding: 24px;
  margin: 16px auto;
  border: 1px solid ${(props) => props.theme.exui.surface.border};
  border-radius: ${(props) => props.theme.exui.radii.extraLarge};
  background: ${(props) => props.theme.exui.surface.background};
  color: ${(props) => props.theme.exui.surface.foreground};
  box-shadow: ${(props) => props.theme.exui.shadow.medium};
`;

const Title = styled.h1`
  margin: 0 0 18px;
  font-size: 18px;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
  align-items: start;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const DocumentProbe = styled.p`
  margin: 16px 0 0;
  font-family: ${(props) => props.theme.fontFamily};
  font-size: 14px;
`;

let container: HTMLDivElement;
let visualIssues: VisualIssue[];
let originalConsoleError: typeof console.error;

function pixels(value: string): number {
  return Number.parseFloat(value);
}

function requireElement(element: Element | null, label: string): Element {
  if (!element) {
    throw new Error(`Missing ${label} in visual fixture`);
  }
  return element;
}

function viewportName(): "desktop" | "mobile" {
  return window.innerWidth >= 1000 ? "desktop" : "mobile";
}

function shouldRun(themeName: ThemeCase["name"]): boolean {
  return viewportName() === "desktop"
    ? themeName === "light" || themeName === "dark"
    : themeName === "pitch-black";
}

async function mount(ui: ReactElement, theme: DefaultTheme): Promise<void> {
  await act(async () => {
    render(
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        {ui}
      </ThemeProvider>,
      container
    );
  });
  await document.fonts.ready;
}

function screenshotName(
  component: string,
  themeName: ThemeCase["name"],
  state = "matrix"
): string {
  return `exui-recipe-${component}-${themeName}-${viewportName()}-${state}`;
}

function handleWindowError(event: ErrorEvent): void {
  visualIssues.push({ message: event.message });
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  visualIssues.push({ message: String(event.reason) });
}

beforeEach(() => {
  container = document.createElement("div");
  container.id = "root";
  document.body.replaceChildren(container);
  document.body.style.margin = "0";
  visualIssues = [];

  const style = document.createElement("style");
  style.dataset.visualTest = "true";
  style.textContent =
    "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
  document.head.append(style);

  originalConsoleError = console.error;
  console.error = (...values: Parameters<typeof console.error>) => {
    visualIssues.push({ message: values.map(String).join(" ") });
  };
  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
});

afterEach(() => {
  act(() => {
    unmountComponentAtNode(container);
  });
  document.querySelector("style[data-visual-test]")?.remove();
  document
    .querySelectorAll("[data-radix-portal]")
    .forEach((portal) => portal.remove());
  window.removeEventListener("error", handleWindowError);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  console.error = originalConsoleError;
});

describe.each(themeCases)(
  "$name Outline recipe contract",
  ({ name, theme }) => {
    it("renders Button and Input geometry and states", async () => {
      if (!shouldRun(name)) {
        return;
      }

      await mount(
        <Canvas data-testid="controls-fixture">
          <Title>Controls</Title>
          <Grid>
            <Stack data-testid="button-fixture">
              <Row>
                <Button data-testid="button-primary">Primary action</Button>
                <Button neutral>Secondary</Button>
                <Button danger>Delete</Button>
                <Button disabled>Disabled</Button>
                <Button icon={<CloseIcon />} aria-label="Close" />
              </Row>
            </Stack>
            <Stack data-testid="input-fixture">
              <Input placeholder="Workspace name" margin={0} />
              <Input
                icon={<CloseIcon />}
                placeholder="Search documents"
                margin={0}
              />
              <Input placeholder="Invalid value" error="Required" margin={0} />
              <Input placeholder="Unavailable" disabled margin={0} />
              <DocumentProbe data-testid="document-font">
                Document content retains the system font stack.
              </DocumentProbe>
            </Stack>
          </Grid>
        </Canvas>,
        theme
      );

      const primary = page.getByTestId("button-primary");
      await expect.element(primary).toBeVisible();
      const primaryStyle = getComputedStyle(primary.element());
      expect(pixels(primaryStyle.height)).toBe(36);
      expect(pixels(primaryStyle.borderRadius)).toBe(9999);
      expect(primaryStyle.fontFamily).toContain("Outfit Variable");

      const input = page.getByPlaceholder("Workspace name");
      const inputSurface = requireElement(
        input.element().parentElement,
        "input surface"
      );
      const inputStyle = getComputedStyle(inputSurface);
      expect(pixels(inputStyle.minHeight)).toBe(36);
      expect(pixels(inputStyle.borderRadius)).toBe(14);
      expect(getComputedStyle(input.element()).paddingInlineStart).toBe("12px");
      expect(
        getComputedStyle(page.getByTestId("document-font").element()).fontFamily
      ).not.toContain("Outfit Variable");

      await expect
        .element(page.getByTestId("button-fixture"))
        .toMatchScreenshot(screenshotName("button", name));
      await expect
        .element(page.getByTestId("input-fixture"))
        .toMatchScreenshot(screenshotName("input", name));
      expect(visualIssues).toEqual([]);
    });

    it("renders Sidebar Item and Tabs as rounded rectangles", async () => {
      if (!shouldRun(name)) {
        return;
      }

      await mount(
        <Canvas data-testid="navigation-fixture">
          <Title>Navigation</Title>
          <Grid>
            <Stack data-testid="sidebar-fixture">
              <SidebarLink label="All documents" />
              <SidebarLink icon={<CloseIcon />} label="Drafts" />
              <SidebarLink active label="Product planning" />
              <SidebarLink depth={1} label="Nested research notes" />
              <SidebarLink disabled label="Unavailable collection" />
            </Stack>
            <Stack data-testid="tabs-fixture">
              <Tabs>
                <Tab active onClick={vi.fn()} data-testid="selected-tab">
                  Overview
                </Tab>
                <Tab active={false} onClick={vi.fn()}>
                  Members
                </Tab>
                <Tab active={false} onClick={vi.fn()} disabled>
                  Archived
                </Tab>
              </Tabs>
            </Stack>
          </Grid>
        </Canvas>,
        theme
      );

      const sidebar = page.getByRole("button", { name: "All documents" });
      const sidebarStyle = getComputedStyle(sidebar.element());
      expect(pixels(sidebarStyle.minHeight)).toBe(32);
      expect(pixels(sidebarStyle.borderRadius)).toBe(14);

      const sidebarWithIcon = page.getByRole("button", { name: "Drafts" });
      expect(
        getComputedStyle(sidebarWithIcon.element()).paddingInlineStart
      ).toBe("12px");

      const selectedTab = page.getByTestId("selected-tab");
      const selectedTabStyle = getComputedStyle(selectedTab.element());
      expect(pixels(selectedTabStyle.borderRadius)).toBe(14);
      const selectedBackground = selectedTabStyle.backgroundColor;
      await selectedTab.hover();
      expect(getComputedStyle(selectedTab.element()).backgroundColor).toBe(
        selectedBackground
      );
      const tabsList = requireElement(
        selectedTab.element().closest("nav"),
        "tabs list"
      );
      expect(pixels(getComputedStyle(tabsList).height)).toBe(36);

      await expect
        .element(page.getByTestId("sidebar-fixture"))
        .toMatchScreenshot(screenshotName("sidebar", name));
      await expect
        .element(page.getByTestId("tabs-fixture"))
        .toMatchScreenshot(screenshotName("tabs", name));
      expect(visualIssues).toEqual([]);
    });

    it("preserves the real Menu portal and keyboard behavior", async () => {
      if (!shouldRun(name)) {
        return;
      }

      await mount(
        <Canvas>
          <Title>Menu</Title>
          <Menu open onOpenChange={vi.fn()}>
            <MenuTrigger>
              <Button>Open menu</Button>
            </MenuTrigger>
            <MenuContent data-testid="menu-content">
              <MenuButton
                data-testid="menu-standard"
                label="Open document"
                shortcut={["Meta+O"]}
                onClick={vi.fn()}
              />
              <MenuButton label="Pinned" selected onClick={vi.fn()} />
              <MenuSeparator />
              <MenuButton label="Delete" dangerous onClick={vi.fn()} />
              <MenuButton label="Unavailable" disabled onClick={vi.fn()} />
            </MenuContent>
          </Menu>
        </Canvas>,
        theme
      );

      const menu = page.getByTestId("menu-content");
      await expect.element(menu).toBeVisible();
      const menuStyle = getComputedStyle(menu.element());
      expect(pixels(menuStyle.paddingTop)).toBe(6);
      expect(pixels(menuStyle.borderRadius)).toBe(22);

      const standardItem = page.getByTestId("menu-standard");
      expect(
        pixels(getComputedStyle(standardItem.element()).borderRadius)
      ).toBe(14);
      standardItem.element().focus();
      expect(document.activeElement).toBe(standardItem.element());

      await expect
        .element(menu)
        .toMatchScreenshot(screenshotName("menu", name, "focused"));
      expect(visualIssues).toEqual([]);
    });

    it("preserves the real Dialog portal and responsive surface", async () => {
      if (!shouldRun(name)) {
        return;
      }

      const handleClose = vi.fn();
      await mount(
        <Modal isOpen title="Workspace settings" onRequestClose={handleClose}>
          <Stack>
            <p>Manage how this workspace appears to your team.</p>
            <Input placeholder="Workspace name" margin={0} />
            <Row>
              <Button neutral>Cancel</Button>
              <Button>Save changes</Button>
            </Row>
          </Stack>
        </Modal>,
        theme
      );

      const dialog = page.getByRole("dialog", { name: "Workspace settings" });
      await expect.element(dialog).toBeVisible();
      const surface = requireElement(
        dialog.element().firstElementChild,
        "dialog surface"
      );
      if (viewportName() === "desktop") {
        const surfaceStyle = getComputedStyle(surface);
        expect(pixels(surfaceStyle.paddingTop)).toBe(24);
        expect(pixels(surfaceStyle.borderRadius)).toBe(26);
        const title = page.getByText("Workspace settings");
        const titleStyle = getComputedStyle(title.element());
        expect(pixels(titleStyle.fontSize)).toBe(16);
        expect(pixels(titleStyle.lineHeight)).toBe(20);
      }

      await expect
        .element(dialog)
        .toMatchScreenshot(screenshotName("dialog", name, "open"));
      expect(dialog.element().contains(document.activeElement)).toBe(true);
      expect(visualIssues).toEqual([]);
    });
  }
);
