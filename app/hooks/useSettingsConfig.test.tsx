import { render } from "@testing-library/react";
import "plugins/passkeys/client";
import { UserRole } from "@shared/types";
import useSettingsConfig from "./useSettingsConfig";

const state = vi.hoisted(() => ({
  user: {
    role: "member",
    get isAdmin() {
      return this.role === "admin";
    },
  },
  integrations: { fetchAll: vi.fn() },
}));

vi.mock("./useStores", () => ({
  default: () => ({
    auth: { user: state.user },
    integrations: state.integrations,
  }),
}));

vi.mock("./useCurrentTeam", () => ({ default: () => ({}) }));
vi.mock("./usePolicy", () => ({
  default: () => ({ update: true, createApiKey: true }),
}));

const SettingsLinks = () => {
  const config = useSettingsConfig();
  return (
    <>
      {config.map((item) => (
        <a key={item.path} href={item.path}>
          {item.name}
        </a>
      ))}
    </>
  );
};

describe("account settings visibility", () => {
  it.each([UserRole.Member, UserRole.Viewer])(
    "hides API access and passkeys for %s users",
    (role) => {
      state.user.role = role;
      const { queryByRole, getByRole } = render(<SettingsLinks />);

      expect(queryByRole("link", { name: "API & Access" })).toBeNull();
      expect(queryByRole("link", { name: "Passkeys" })).toBeNull();
      expect(getByRole("link", { name: "Preferences" })).toBeInTheDocument();
    }
  );

  it("keeps API access and passkeys available to admins", () => {
    state.user.role = UserRole.Admin;
    const { getByRole } = render(<SettingsLinks />);

    expect(getByRole("link", { name: "API & Access" })).toHaveAttribute(
      "href",
      "/settings/api-and-access"
    );
    expect(getByRole("link", { name: "Passkeys" })).toHaveAttribute(
      "href",
      "/settings/passkeys"
    );
  });

  it("refreshes visibility when the current user changes", () => {
    state.user.role = UserRole.Admin;
    const { getByRole, queryByRole, rerender } = render(<SettingsLinks />);
    expect(getByRole("link", { name: "Passkeys" })).toBeInTheDocument();

    state.user = {
      role: UserRole.Member,
      get isAdmin() {
        return this.role === UserRole.Admin;
      },
    };
    rerender(<SettingsLinks />);

    expect(queryByRole("link", { name: "API & Access" })).toBeNull();
    expect(queryByRole("link", { name: "Passkeys" })).toBeNull();
  });
});
