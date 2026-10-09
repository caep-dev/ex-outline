import { light } from "@shared/styles/theme";
import { renderWithTheme } from "~/test/renderWithTheme";
import SidebarButton from "./SidebarButton";

it("keeps compact account controls 4px apart with a square notification target", () => {
  const { getByRole } = renderWithTheme(
    <SidebarButton
      position="bottom"
      aria-label="Account"
      title="Account"
      image={<span>Avatar</span>}
      onClick={() => {}}
    >
      <SidebarButton
        position="bottom"
        aria-label="Notifications"
        image={<svg />}
        title={null}
        onClick={() => {}}
      />
    </SidebarButton>
  );
  for (const name of ["Account", "Notifications"]) {
    expect(getByRole("button", { name })).toHaveStyle("min-height: 36px");
    expect(getByRole("button", { name })).toHaveStyle("padding: 6px 8px");
    expect(getByRole("button", { name })).toHaveStyle(
      `border-radius: ${light.exui.components.sidebarItem.default.radius}`
    );
  }
  expect(getByRole("button", { name: "Notifications" })).toHaveStyle(
    "width: 36px; height: 36px; flex: 0 0 36px; margin-inline: 0 8px"
  );
  expect(getByRole("button", { name: "Account" })).toHaveStyle(
    "margin-inline: 8px 0"
  );
  expect(getByRole("button", { name: "Account" }).parentElement).toHaveStyle(
    "gap: 4px"
  );
});
