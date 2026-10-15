import { beforeAll, describe, expect, it } from "vitest";

// skin.js is a classic script (the page loads it in the head, before first paint), so it puts
// its logic on globalThis instead of exporting it.
let skins;
beforeAll(async () => {
  await import("../../timer_app_pr_tracker/static/js/skin.js");
  skins = globalThis.TimerSkins;
});

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    data,
  };
}

describe("the skin list", () => {
  it("offers the Scramble Challenge skins, Minimal first", () => {
    expect(skins.SKINS.map(([id]) => id)).toEqual([
      "plain",
      "dark",
      "dos",
      "mario64",
      "monkeyisland2",
      "neon80s",
    ]);
    expect(skins.SKINS.map(([, label]) => label)).toEqual([
      "Minimal",
      "Dark",
      "DOS",
      "Mario",
      "Monkey",
      "VHS",
    ]);
  });

  it("starts on Minimal", () => {
    expect(skins.DEFAULT_SKIN).toBe("plain");
  });
});

describe("choosing a skin", () => {
  it("keeps a known skin", () => {
    expect(skins.chooseSkin("dos")).toBe("dos");
  });

  it("falls back to the default for anything else", () => {
    for (const value of [null, "", "nope", "__proto__", "constructor", 7]) {
      expect(skins.chooseSkin(value)).toBe("plain");
    }
  });
});

describe("remembering the skin", () => {
  it("reads back what was saved", () => {
    const storage = fakeStorage();
    skins.saveSkin(storage, "neon80s");
    expect(skins.readSkin(storage)).toBe("neon80s");
  });

  it("reads the default when nothing or rubbish was saved", () => {
    expect(skins.readSkin(fakeStorage())).toBe("plain");
    expect(skins.readSkin(fakeStorage({ "timer-pr-skin": "<script>" }))).toBe("plain");
  });

  it("copes with storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(skins.readSkin(broken)).toBe("plain");
    expect(() => skins.saveSkin(broken, "dos")).not.toThrow();
  });

  it("copes with no storage at all", () => {
    expect(skins.readSkin(undefined)).toBe("plain");
    expect(() => skins.saveSkin(undefined, "dos")).not.toThrow();
  });
});

describe("the stylesheet", () => {
  it("is the skin's theme.css under static/themes", () => {
    expect(skins.themeHref("mario64")).toBe("/static/themes/mario64/theme.css");
  });
});
