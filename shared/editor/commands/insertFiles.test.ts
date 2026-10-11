import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FileHelper from "../lib/FileHelper";
import uploadPlaceholder from "../lib/uploadPlaceholder";
import insertFiles from "./insertFiles";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "inline*",
      toDOM: () => ["p", 0],
    },
    text: { group: "inline" },
    image: {
      inline: true,
      group: "inline",
      attrs: { src: {} },
      toDOM: (node) => ["img", { src: node.attrs.src }],
    },
    attachment: {
      inline: true,
      group: "inline",
      attrs: {
        href: {},
        title: {},
        size: {},
        contentType: {},
        preview: {},
      },
      toDOM: (node) => ["a", { href: node.attrs.href }, node.attrs.title],
    },
  },
});

describe("insertFiles image lifecycle", () => {
  let view: EditorView;
  let images: HTMLImageElement[];
  let uploading: boolean;
  let notices: string[];

  beforeEach(() => {
    images = [];
    notices = [];
    uploading = false;
    vi.spyOn(FileHelper, "getImageDimensions").mockResolvedValue({
      width: 10,
      height: 10,
    });
    vi.spyOn(FileHelper, "getImageSourceAttr").mockResolvedValue(undefined);
    vi.stubGlobal("Image", function () {
      const image = document.createElement("img");
      images.push(image);
      return image;
    });
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL() {
          return "blob:preview";
        }
      }
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const container = document.createElement("div");
    document.body.appendChild(container);
    view = new EditorView(container, {
      state: EditorState.create({ schema, plugins: [uploadPlaceholder] }),
    });
  });

  afterEach(() => {
    view.destroy();
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const startUpload = (
    uploadFile = async () => "/docs/api/attachments.redirect?id=image"
  ) =>
    insertFiles(
      view,
      new Event("drop"),
      1,
      [
        new File(["image"], "image.png", {
          type: "image/png",
        }),
      ],
      {
        uploadFile,
        onFileUploadStart: () => {
          uploading = true;
        },
        onFileUploadStop: () => {
          uploading = false;
        },
        onNotice: (message) => {
          notices.push(message);
        },
      }
    );

  it("keeps the upload active until the downloaded image is inserted", async () => {
    await startUpload();
    await vi.waitFor(() => expect(images).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(uploading).toBe(true);
    expect(view.dom.querySelectorAll(".placeholder")).toHaveLength(1);

    images[0].dispatchEvent(new Event("load"));

    await vi.waitFor(() => expect(uploading).toBe(false));
    expect(view.dom.querySelectorAll(".placeholder")).toHaveLength(0);
    expect(view.state.doc.firstChild?.firstChild?.attrs.src).toBe(
      "/docs/api/attachments.redirect?id=image"
    );
  });

  it("removes a failed image placeholder and allows subsequent text input", async () => {
    await startUpload();
    await vi.waitFor(() => expect(images).toHaveLength(1));
    const handleError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", handleError);
    images[0].dispatchEvent(new Event("error"));
    window.removeEventListener("error", handleError);

    await vi.waitFor(() => {
      expect(view.dom.querySelectorAll(".placeholder")).toHaveLength(0);
      expect(uploading).toBe(false);
      expect(notices).toHaveLength(1);
    });
    view.dispatch(view.state.tr.insertText("continue typing", 1));
    expect(view.dom.textContent).toBe("continue typing");
  });

  it("cleans up when the upload request itself fails", async () => {
    await startUpload(async () => {
      throw new Error("Upload failed");
    });
    await vi.waitFor(() => {
      expect(view.dom.querySelectorAll(".placeholder")).toHaveLength(0);
      expect(uploading).toBe(false);
      expect(notices).toEqual(["Upload failed"]);
    });
  });

  it("uploads a plain attachment through its detached placeholder without a theme provider", async () => {
    let finishUpload: (url: string) => void = () => {
      throw new Error("Upload has not started");
    };
    const uploadFile = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishUpload = resolve;
        })
    );
    await insertFiles(
      view,
      new Event("change"),
      1,
      [
        new File(["acceptance"], "runtime-attachment.txt", {
          type: "text/plain",
        }),
      ],
      {
        uploadFile,
        isAttachment: true,
        onFileUploadStart: () => {
          uploading = true;
        },
        onFileUploadStop: () => {
          uploading = false;
        },
      }
    );
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(view.dom.querySelector(".file.placeholder")?.textContent).toContain(
      "txt"
    );
    expect(uploading).toBe(true);

    finishUpload("/docs/api/attachments.redirect?id=attachment");
    await vi.waitFor(() => expect(uploading).toBe(false));
    expect(view.dom.querySelector(".placeholder")).toBeNull();
    expect(view.state.doc.firstChild?.firstChild?.type.name).toBe("attachment");
    expect(view.dom.querySelector("a")?.getAttribute("href")).toBe(
      "/docs/api/attachments.redirect?id=attachment"
    );
    expect(view.dom.textContent).toContain("runtime-attachment.txt");
  });
});
