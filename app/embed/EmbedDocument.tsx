"use client";

import { useEffect } from "react";

const COLLAPSED = 72;
const MSG = "blake-embed-height";

function measureHeight() {
  const bottoms = [COLLAPSED];
  for (const el of document.querySelectorAll(".pn-root, .pn, .pn-music, .mp")) {
    bottoms.push(el.getBoundingClientRect().bottom);
  }
  return Math.ceil(Math.max(...bottoms) + 8);
}

/**
 * Short sticky Framer embed (~72px collapsed).
 * Reports needed height to parent so a FIXED overlay iframe can grow
 * over the page (no document reflow / page jump).
 */
export function EmbedDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.dataset.embed = "";
    body.dataset.embed = "";

    let last = 0;
    let timer = 0;

    const applyChrome = () => {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.margin = "0";
      body.style.margin = "0";
      html.style.background = "transparent";
      body.style.background = "transparent";
      html.style.clipPath = "none";
      body.style.clipPath = "none";
    };

    const publish = () => {
      applyChrome();
      const height = measureHeight();
      html.style.height = `${height}px`;
      body.style.height = `${height}px`;
      html.style.minHeight = `${height}px`;
      body.style.minHeight = `${height}px`;
      html.style.maxHeight = `${height}px`;
      body.style.maxHeight = `${height}px`;
      if (height === last || window.parent === window) return;
      last = height;
      window.parent.postMessage({ type: MSG, height }, "*");
    };

    const schedule = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        requestAnimationFrame(publish);
      }, 40);
    };

    applyChrome();
    publish();

    const watched = new Set<Element>();
    const ro = new ResizeObserver(schedule);
    const watch = (el: Element | null) => {
      if (!el || watched.has(el)) return;
      watched.add(el);
      ro.observe(el);
    };
    const sync = () => {
      watch(document.querySelector(".pn-root"));
      watch(document.querySelector(".pn-music"));
      watch(document.querySelector(".mp"));
      schedule();
    };
    sync();

    const mo = new MutationObserver(sync);
    mo.observe(body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-expanded", "class", "style"],
    });
    body.addEventListener("click", schedule, true);
    window.addEventListener("resize", schedule);

    return () => {
      ro.disconnect();
      mo.disconnect();
      body.removeEventListener("click", schedule, true);
      window.removeEventListener("resize", schedule);
      if (timer) window.clearTimeout(timer);
      delete html.dataset.embed;
      delete body.dataset.embed;
      html.style.cssText = "";
      body.style.cssText = "";
    };
  }, []);

  return null;
}
