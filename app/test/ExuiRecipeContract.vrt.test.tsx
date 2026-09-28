/* oxlint-disable no-console -- the visual harness captures browser console errors */
import { CloseIcon } from "outline-icons";
import { createRef, type ReactElement } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
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
import { glassSurface } from "@shared/styles/glass";
import EditorContainer from "@shared/editor/components/Styles";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { Calendar } from "@shared/components/Calendar";
import ColorPicker from "@shared/components/ColorPicker";
import Switch from "~/components/Switch";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { OneTimePasswordInput } from "~/components/OneTimePasswordInput";
import Notice from "~/components/Notice";
import Text from "~/components/Text";
import SuggestionsMenuItem from "~/editor/components/SuggestionsMenuItem";
import { SplitButton } from "~/components/primitives/SplitButton";
import {
  InputSelectRoot,
  InputSelectTrigger,
  InputSelectContent,
  InputSelectItem,
} from "~/components/primitives/InputSelect";
import Modal from "~/components/Modal";
import SidebarLink from "~/components/Sidebar/components/SidebarLink";
import { Tab } from "~/components/Tabs/Tab";
import { Tabs } from "~/components/Tabs/Tabs";
import SearchPageInput from "~/scenes/Search/components/SearchInput";
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

const GlassProbe = styled.div`
  ${glassSurface}
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

it.each(themeCases)(
  "renders editor tokens and glass material in $name",
  async ({ theme }) => {
    await mount(
      <Canvas>
        <GlassProbe data-testid="glass">Glass surface</GlassProbe>
        <EditorContainer $rtl={false}>
          <div className="ProseMirror">
            <div className={EditorStyleHelper.notice}>
              <p>Notice content</p>
            </div>
            <pre>
              <code>const example = true;</code>
            </pre>
          </div>
        </EditorContainer>
      </Canvas>,
      theme
    );
    const glass = page.getByTestId("glass").element();
    expect(getComputedStyle(glass).backdropFilter).toContain(
      `blur(${theme.exui.glass.blur})`
    );
    expect(getComputedStyle(glass).boxShadow).toContain("inset");
    const notice = requireElement(
      container.querySelector(`.${EditorStyleHelper.notice}`),
      "editor notice"
    );
    expect(pixels(getComputedStyle(notice).borderRadius)).toBe(14);
    expect(getComputedStyle(notice).backgroundColor).not.toBe(
      "rgba(0, 0, 0, 0)"
    );
    expect(visualIssues).toEqual([]);
  }
);

it.each(themeCases)(
  "scales switch geometry and preserves compact overrides in $name",
  async ({ theme }) => {
    await mount(
      <Canvas>
        <Switch aria-label="Default switch" checked />
        <Switch aria-label="Compact switch" width={26} height={14} checked />
      </Canvas>,
      theme
    );
    const control = page
      .getByRole("switch", { name: "Default switch" })
      .element();
    const compact = page
      .getByRole("switch", { name: "Compact switch" })
      .element();
    const thumb = requireElement(control.firstElementChild, "switch thumb");
    expect(pixels(getComputedStyle(control).width)).toBe(44);
    expect(pixels(getComputedStyle(control).height)).toBe(20);
    expect(pixels(getComputedStyle(thumb).width)).toBe(24);
    const originalFontSize = document.documentElement.style.fontSize;
    try {
      document.documentElement.style.fontSize = "20px";
      expect(pixels(getComputedStyle(control).width)).toBe(55);
      expect(pixels(getComputedStyle(compact).width)).toBe(26);
      expect(pixels(getComputedStyle(compact).height)).toBe(14);
      expect(thumb.getBoundingClientRect().right).toBeLessThanOrEqual(
        control.getBoundingClientRect().right
      );
    } finally {
      document.documentElement.style.fontSize = originalFontSize;
    }
  }
);

it.each(themeCases)(
  "preserves calendar selection and color input geometry in $name",
  async ({ theme }) => {
    const onSelect = vi.fn();
    await mount(
      <Canvas>
        <Calendar
          mode="single"
          defaultMonth={new Date(2026, 8, 1)}
          selected={new Date(2026, 8, 15)}
          onSelect={onSelect}
        />
        <ColorPicker activeColor="#336699" alpha={false} onSelect={vi.fn()} />
      </Canvas>,
      theme
    );
    const day = requireElement(
      container.querySelector(".rdp-day_selected"),
      "selected day"
    );
    expect(pixels(getComputedStyle(day).height)).toBe(32);
    const anotherDay = requireElement(
      container.querySelector(
        ".rdp-day:not(.rdp-day_selected):not(.rdp-day_outside)"
      ),
      "another day"
    );
    await page.elementLocator(anotherDay).click();
    expect(onSelect).toHaveBeenCalledOnce();
    const input = requireElement(
      container.querySelector("input"),
      "color input"
    );
    expect(pixels(getComputedStyle(input).minHeight)).toBe(36);
    expect(pixels(getComputedStyle(input).borderRadius)).toBe(14);
  }
);

it.each(themeCases)(
  "preserves split button selection in $name",
  async ({ theme }) => {
    const onSelect = vi.fn();
    const onClick = vi.fn();
    await mount(
      <Canvas>
        <SplitButton
          options={[
            { label: "Publish", value: "publish" },
            { label: "Save draft", value: "draft" },
          ]}
          selectedValue="publish"
          onSelect={onSelect}
          onClick={onClick}
        >
          Publish document
        </SplitButton>
      </Canvas>,
      theme
    );
    const main = page.getByRole("button", { name: "Publish document" });
    const surface = requireElement(
      main.element().parentElement,
      "split button surface"
    );
    expect(pixels(getComputedStyle(surface).height)).toBe(36);
    expect(pixels(getComputedStyle(surface).borderRadius)).toBe(9999);
    await main.click();
    expect(onClick).toHaveBeenCalledOnce();
    const disclosure = requireElement(
      container.querySelector('[aria-haspopup="menu"]'),
      "split button disclosure"
    );
    await page.elementLocator(disclosure).click();
    const option = page.getByRole("menuitem", { name: "Save draft" });
    await expect.element(option).toBeVisible();
    expect(pixels(getComputedStyle(option.element()).borderRadius)).toBe(14);
    await option.click();
    expect(onSelect).toHaveBeenCalledWith("draft");
  }
);

it.each(themeCases)(
  "keeps selected editor suggestion text readable in $name",
  async ({ theme }) => {
    await mount(
      <Canvas>
        <SuggestionsMenuItem
          selected
          onClick={vi.fn()}
          title="Document"
          subtitle="Workspace"
          shortcut="Enter"
        />
      </Canvas>,
      theme
    );
    const button = requireElement(
      container.querySelector("button"),
      "suggestion button"
    );
    const subtitle = page.getByText("Workspace").element();
    const shortcut = page.getByText("Enter").element();
    expect(getComputedStyle(subtitle).color).toBe(
      getComputedStyle(button).color
    );
    expect(getComputedStyle(shortcut).color).toBe(
      getComputedStyle(button).color
    );
  }
);

it.each(themeCases)(
  "scales OTP fields and notices in $name",
  async ({ theme }) => {
    await mount(
      <Canvas>
        <OneTimePasswordInput aria-label="Verification code" />
        <Notice>Verification required</Notice>
        <Text data-testid="scaled-text" size="small" type="danger">
          Verification failed
        </Text>
      </Canvas>,
      theme
    );
    const field = requireElement(
      container.querySelector('input:not([type="hidden"])'),
      "OTP field"
    );
    const originalFontSize = document.documentElement.style.fontSize;
    try {
      document.documentElement.style.fontSize = "16px";
      const initialHeight = pixels(getComputedStyle(field).height);
      const initialRadius = pixels(getComputedStyle(field).borderRadius);
      const text = requireElement(
        container.querySelector('[data-testid="scaled-text"]'),
        "scaled text"
      );
      const initialTextSize = pixels(getComputedStyle(text).fontSize);
      document.documentElement.style.fontSize = "20px";
      expect(pixels(getComputedStyle(field).height)).toBeCloseTo(
        initialHeight * 1.25
      );
      expect(pixels(getComputedStyle(field).borderRadius)).toBeCloseTo(
        initialRadius * 1.25
      );
      expect(pixels(getComputedStyle(text).fontSize)).toBeCloseTo(
        initialTextSize * 1.25
      );
      expect(getComputedStyle(field).backgroundColor).not.toBe(
        "rgba(0, 0, 0, 0)"
      );
    } finally {
      document.documentElement.style.fontSize = originalFontSize;
    }
  }
);

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
    it("uses the menu surface for Select and preserves selection", async () => {
      const handleValueChange = vi.fn();
      await mount(
        <InputSelectRoot
          defaultOpen
          defaultValue="first"
          onValueChange={handleValueChange}
        >
          <InputSelectTrigger placeholder="Choose an option" />
          <InputSelectContent>
            <InputSelectItem value="first">First option</InputSelectItem>
            <InputSelectItem value="second">Second option</InputSelectItem>
          </InputSelectContent>
        </InputSelectRoot>,
        theme
      );
      const list = page.getByRole("listbox");
      await expect.element(list).toBeVisible();
      const style = getComputedStyle(list.element());
      expect(pixels(style.borderRadius)).toBe(22);
      expect(pixels(style.paddingTop)).toBe(6);
      expect(style.fontFamily).toContain("Outfit");
      await page.getByRole("option", { name: "Second option" }).click();
      expect(handleValueChange).toHaveBeenCalledWith("second");
      const triggerStyle = getComputedStyle(
        page.getByRole("combobox").element()
      );
      expect(pixels(triggerStyle.borderRadius)).toBe(14);
      expect(pixels(triggerStyle.height)).toBe(36);
      await expect
        .element(page.getByRole("combobox"))
        .toHaveTextContent("Second option");
    });

    it.skipIf(!shouldRun(name))(
      "renders Button and Input geometry and states",
      async () => {
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
                <Input
                  placeholder="Invalid value"
                  error="Required"
                  margin={0}
                />
                <Input placeholder="Unavailable" disabled margin={0} />
                <DocumentProbe data-testid="document-font">
                  Document content follows the ExUI font stack.
                </DocumentProbe>
              </Stack>
            </Grid>
          </Canvas>,
          theme
        );

        // Earlier interaction cases may leave the pointer over an action.
        await page.getByText("Controls", { exact: true }).hover();
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
        expect(getComputedStyle(input.element()).paddingInlineStart).toBe(
          "12px"
        );
        expect(
          getComputedStyle(page.getByTestId("document-font").element())
            .fontFamily
        ).toContain("Outfit Variable");

        await expect
          .element(page.getByTestId("button-fixture"))
          .toMatchScreenshot(screenshotName("button", name));
        await expect
          .element(page.getByTestId("input-fixture"))
          .toMatchScreenshot(screenshotName("input", name));
        expect(visualIssues).toEqual([]);
      }
    );

    it.skipIf(!shouldRun(name))(
      "uses the ExUI placeholder color and opacity in the search page input",
      async () => {
        const inputRef = createRef<HTMLInputElement>();
        await mount(
          <SearchPageInput
            name="query"
            defaultValue=""
            placeholder="Search…"
            ref={inputRef}
          />,
          theme
        );

        const input = requireElement(inputRef.current, "search input");
        const colorProbe = document.createElement("span");
        colorProbe.style.color =
          theme.exui.components.formControl.base.placeholder;
        document.body.append(colorProbe);
        const expectedColor = getComputedStyle(colorProbe).color;
        colorProbe.remove();

        const placeholderStyle = getComputedStyle(input, "::placeholder");
        expect(placeholderStyle.color).toBe(expectedColor);
        expect(placeholderStyle.opacity).toBe("1");
        expect(placeholderStyle.fontWeight).toBe(
          String(theme.exui.components.formControl.base.fontWeight)
        );
        expect(visualIssues).toEqual([]);
      }
    );

    it.skipIf(!shouldRun(name))(
      "renders Sidebar Item as rounded rectangles and Tabs as pills",
      async () => {
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
        expect(pixels(selectedTabStyle.borderRadius)).toBe(9999);
        expect(selectedTab.element().firstElementChild).toBeNull();
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
        expect(pixels(getComputedStyle(tabsList).borderRadius)).toBe(9999);
        const tabsWrapper = requireElement(
          tabsList.parentElement,
          "tabs wrapper"
        );
        expect(tabsList.getBoundingClientRect().width).toBeLessThan(
          tabsWrapper.getBoundingClientRect().width
        );

        await expect
          .element(page.getByTestId("sidebar-fixture"))
          .toMatchScreenshot(screenshotName("sidebar", name));
        await expect
          .element(page.getByTestId("tabs-fixture"))
          .toMatchScreenshot(screenshotName("tabs", name));
        expect(visualIssues).toEqual([]);
      }
    );

    it.skipIf(!shouldRun(name))(
      "keeps collection tabs scrollable while preserving route links",
      async () => {
        await mount(
          <div style={{ width: 260 }}>
            <MemoryRouter initialEntries={["/collection/recent"]}>
              <Tabs>
                <Tab to="/collection/recent">Documents</Tab>
                <Tab to="/collection/popular">Popular</Tab>
                <Tab to="/collection/updated">Recently updated</Tab>
                <Tab to="/collection/published">Recently published</Tab>
                <Tab to="/collection/old">Least recently updated</Tab>
                <Tab to="/collection/alphabetical">A–Z</Tab>
              </Tabs>
            </MemoryRouter>
          </div>,
          theme
        );

        const nav = page.getByRole("navigation").element();
        expect(nav.scrollWidth).toBeGreaterThan(nav.clientWidth);

        const lastTab = page.getByRole("link", { name: "A–Z" });
        await lastTab.click();
        await expect.element(lastTab).toHaveAttribute("aria-current", "page");
        expect(nav.scrollLeft).toBeGreaterThan(0);
        expect(visualIssues).toEqual([]);
      }
    );

    it.skipIf(!shouldRun(name))(
      "preserves the real Menu portal and keyboard behavior",
      async () => {
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
      }
    );

    it.skipIf(!shouldRun(name))(
      "preserves the real Dialog portal and responsive surface",
      async () => {
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
        expect(getComputedStyle(dialog.element()).fontFamily).toContain(
          "Outfit"
        );
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
      }
    );
  }
);
