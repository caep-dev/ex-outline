import { glob, globSync } from "glob";
import { PluginManager } from "./PluginManager";

describe("PluginManager", () => {
  it("discovers authentication plugin entry points on the current platform", () => {
    const wasLoaded = Reflect.get(PluginManager, "loaded");
    let discovered: string[] = [];
    const globSpy = vi.spyOn(glob, "sync").mockImplementation((pattern) => {
      discovered = globSync(pattern);
      return [];
    });

    try {
      Reflect.set(PluginManager, "loaded", false);
      PluginManager.loadPlugins();
      expect(
        discovered.some((entry) =>
          /(?:^|\/)plugins\/email\/server\/index\.[jt]s$/.test(
            entry.replace(/\\/g, "/")
          )
        )
      ).toBe(true);
    } finally {
      globSpy.mockRestore();
      Reflect.set(PluginManager, "loaded", wasLoaded);
    }
  });
});
