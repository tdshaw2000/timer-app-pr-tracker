// Skins: the same set as Scramble Challenge. A skin is a folder under static/themes/ holding
// theme.css. This is a classic script in the head so the chosen skin is in place before the
// first paint; the logic sits on globalThis.TimerSkins so the tests can reach it.
(function () {
  "use strict";

  const SKINS = [
    ["plain", "Minimal"],
    ["dark", "Dark"],
    ["dos", "DOS"],
    ["mario64", "Mario"],
    ["monkeyisland2", "Monkey"],
    ["neon80s", "VHS"],
  ];
  const DEFAULT_SKIN = "plain";
  const STORAGE_KEY = "timer-pr-skin";

  function chooseSkin(value) {
    return SKINS.some(([id]) => id === value) ? value : DEFAULT_SKIN;
  }

  function readSkin(storage) {
    try {
      return chooseSkin(storage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_SKIN;
    }
  }

  function saveSkin(storage, id) {
    try {
      storage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode or blocked storage: the skin still changes, it just isn't remembered.
    }
  }

  function themeHref(id) {
    return `/static/themes/${id}/theme.css`;
  }

  globalThis.TimerSkins = { SKINS, DEFAULT_SKIN, chooseSkin, readSkin, saveSkin, themeHref };
  if (typeof document === "undefined") return;

  let storage;
  try {
    storage = globalThis.localStorage;
  } catch {
    storage = undefined;
  }
  let current = readSkin(storage);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.id = "skin-css";
  stylesheet.href = themeHref(current);
  document.head.append(stylesheet);

  // Charts draw with the skin's colours, so they ask to be told once a new sheet is in.
  stylesheet.addEventListener("load", () => {
    document.dispatchEvent(new CustomEvent("skinchange", { detail: current }));
  });

  document.addEventListener("DOMContentLoaded", () => {
    const picker = document.querySelector(".skin-picker");
    if (!picker) return;
    const menu = picker.querySelector(".skin-menu");
    for (const [id, label] of SKINS) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "skin-option";
      option.textContent = label;
      option.dataset.skin = id;
      menu.append(option);
    }
    const mark = () => {
      for (const option of menu.querySelectorAll(".skin-option")) {
        if (option.dataset.skin === current) option.setAttribute("aria-current", "true");
        else option.removeAttribute("aria-current");
      }
    };
    mark();
    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".skin-option");
      if (!option) return;
      current = chooseSkin(option.dataset.skin);
      saveSkin(storage, current);
      stylesheet.href = themeHref(current);
      mark();
      picker.open = false;
    });
    // A tap anywhere outside the open menu closes it.
    document.addEventListener("click", (event) => {
      if (picker.open && !picker.contains(event.target)) picker.open = false;
    });
  });
})();
