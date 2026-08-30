import { renderToString } from "react-dom/server";
import { ServerStyleSheet, ThemeProvider } from "styled-components";
import GlobalStyles from "@shared/styles/globals";
import { light } from "@shared/styles/theme";

const normalize = (value: string) => value.replace(/\s+/g, "");

describe("GlobalStyles typography", () => {
  it("scopes Outfit to the application root and restores document typography for print", () => {
    const sheet = new ServerStyleSheet();
    renderToString(
      sheet.collectStyles(
        <ThemeProvider theme={light}>
          <GlobalStyles />
          <div id="root">
            <button type="button">Save</button>
          </div>
        </ThemeProvider>
      )
    );
    const css = normalize(sheet.getStyleTags());
    sheet.seal();

    expect(css).toContain("#root");
    expect(css).toContain("OutfitVariable");
    expect(css).toContain("@mediaprint");
    expect(css).toContain(normalize(light.fontFamily));
    expect(light.fontFamily).not.toBe(light.exui.typography.fontFamily);
  });
});
