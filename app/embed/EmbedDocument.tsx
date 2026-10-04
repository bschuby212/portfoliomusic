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

function postEmbedHeight() {
  if (window.parent === window) return;
  const height = measureEmbedHeight();
  window.parent.postMessage({ type: MSG_TYPE, height }, "*");
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

    postEmbedHeight();
    const ro = new ResizeObserver(() => postEmbedHeight());
    ro.observe(html);
    ro.observe(body);
    const root = document.querySelector(".pn-root");
    if (root) ro.observe(root);
    const mo = new MutationObserver(() => postEmbedHeight());
    mo.observe(body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-expanded", "class", "style"],
    });
    window.addEventListener("resize", postEmbedHeight);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", postEmbedHeight);
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
