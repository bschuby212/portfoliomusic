"use client";

import { useEffect } from "react";

const COLLAPSED_HEIGHT = 72;
const MSG_TYPE = "blake-embed-height";

function measureEmbedHeight() {
  const bottoms = [COLLAPSED_HEIGHT];
  for (const el of document.querySelectorAll(".pn-root, .pn, .pn-music, .mp")) {
    bottoms.push(el.getBoundingClientRect().bottom);
  }
  return Math.ceil(Math.max(...bottoms) + 8);
}

let lastPosted = 0;
let scheduled = 0;

function postEmbedHeight() {
  if (window.parent === window) return;
  const height = measureEmbedHeight();
  if (height === lastPosted) return;
  lastPosted = height;
  window.parent.postMessage({ type: MSG_TYPE, height }, "*");
}

function scheduleEmbedHeight() {
  // Fixed nav/player don't resize <html>, so wait a frame for expand layout.
  if (scheduled) return;
  scheduled = window.setTimeout(() => {
    scheduled = 0;
    requestAnimationFrame(postEmbedHeight);
  }, 50);
}

/**
 * Fixed-top Framer embed: overflow visible + tell the parent iframe how tall
 * we need so expand can overfill (browsers clip iframe contents otherwise).
 */
export function EmbedDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.dataset.embed = "";
    body.dataset.embed = "";

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverflowX: html.style.overflowX,
      bodyOverflowX: body.style.overflowX,
      htmlOverflowY: html.style.overflowY,
      bodyOverflowY: body.style.overflowY,
    };

    html.style.overflow = "visible";
    body.style.overflow = "visible";
    html.style.overflowX = "visible";
    body.style.overflowX = "visible";
    html.style.overflowY = "visible";
    body.style.overflowY = "visible";
    html.style.height = "auto";
    body.style.height = "auto";
    html.style.minHeight = `${COLLAPSED_HEIGHT}px`;
    body.style.minHeight = `${COLLAPSED_HEIGHT}px`;
    html.style.maxHeight = "none";
    body.style.maxHeight = "none";
    html.style.clipPath = "none";
    body.style.clipPath = "none";

    const watched = new Set<Element>();
    const ro = new ResizeObserver(() => scheduleEmbedHeight());
    const watch = (el: Element | null) => {
      if (!el || watched.has(el)) return;
      watched.add(el);
      ro.observe(el);
    };

    const syncWatches = () => {
      watch(document.querySelector(".pn-root"));
      watch(document.querySelector(".pn-music"));
      watch(document.querySelector(".mp"));
      scheduleEmbedHeight();
    };

    syncWatches();
    const mo = new MutationObserver(syncWatches);
    mo.observe(body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-expanded", "class", "style"],
    });
    window.addEventListener("resize", scheduleEmbedHeight);
    // Click/keyboard expand also lands here after React paint.
    body.addEventListener("click", scheduleEmbedHeight, true);
    body.addEventListener("keyup", scheduleEmbedHeight, true);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", scheduleEmbedHeight);
      body.removeEventListener("click", scheduleEmbedHeight, true);
      body.removeEventListener("keyup", scheduleEmbedHeight, true);
      delete html.dataset.embed;
      delete body.dataset.embed;
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overflowX = prev.htmlOverflowX;
      body.style.overflowX = prev.bodyOverflowX;
      html.style.overflowY = prev.htmlOverflowY;
      body.style.overflowY = prev.bodyOverflowY;
      html.style.height = "";
      body.style.height = "";
      html.style.minHeight = "";
      body.style.minHeight = "";
      html.style.maxHeight = "";
      body.style.maxHeight = "";
      html.style.clipPath = "";
      body.style.clipPath = "";
    };
  }, []);

  return null;
}
