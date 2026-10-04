"use client";

import { useEffect } from "react";

const COLLAPSED = 72;
const MSG = "blake-embed-height";

function measureOverlayHeight() {
  const bottoms = [COLLAPSED];
  for (const el of document.querySelectorAll(".pn-root, .pn, .pn-music, .mp")) {
    bottoms.push(el.getBoundingClientRect().bottom);
  }
  return Math.ceil(Math.max(...bottoms) + 8);
}

/**
 * Keep the embed DOCUMENT at 72px always (Framer scale-to-fit crushes
 * content if the document grows taller than the Embed frame).
 * Tell the parent how tall the FIXED overlay iframe should be so expand
 * can show without clipping — page layout does not move.
 */
export function EmbedDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.dataset.embed = "";
    body.dataset.embed = "";

    let last = 0;
    let timer = 0;

    const lockDoc = () => {
      // Document footprint stays collapsed — never grow this or Framer crushes.
      for (const el of [html, body]) {
        el.style.overflow = "visible";
        el.style.overflowX = "visible";
        el.style.overflowY = "visible";
        el.style.height = `${COLLAPSED}px`;
        el.style.minHeight = `${COLLAPSED}px`;
        el.style.maxHeight = `${COLLAPSED}px`;
        el.style.margin = "0";
        el.style.padding = "0";
        el.style.background = "transparent";
        el.style.clipPath = "none";
        el.style.zoom = "1";
        el.style.transform = "none";
      }
      html.style.setProperty("-webkit-text-size-adjust", "100%");
    };

    const publish = () => {
      lockDoc();
      const height = measureOverlayHeight();
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

    lockDoc();
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
