"use client";

import { useEffect } from "react";

/** Tall enough for collapsed bar + expanded player; never resizes with expand. */
const EMBED_CANVAS = 240;

/**
 * Fixed-top Framer embed: constant canvas height so the parent page never
 * jumps when the music panel expands. Empty area stays transparent.
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
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    };

    const apply = () => {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.overflowX = "hidden";
      body.style.overflowX = "hidden";
      html.style.overflowY = "hidden";
      body.style.overflowY = "hidden";
      html.style.height = `${EMBED_CANVAS}px`;
      body.style.height = `${EMBED_CANVAS}px`;
      html.style.minHeight = `${EMBED_CANVAS}px`;
      body.style.minHeight = `${EMBED_CANVAS}px`;
      html.style.maxHeight = `${EMBED_CANVAS}px`;
      body.style.maxHeight = `${EMBED_CANVAS}px`;
      html.style.clipPath = "none";
      body.style.clipPath = "none";
      window.scrollTo(0, 0);
    };

    apply();
    const lockScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", lockScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", lockScroll, true);
      delete html.dataset.embed;
      delete body.dataset.embed;
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.height = prev.htmlHeight;
      body.style.height = prev.bodyHeight;
      html.style.minHeight = "";
      body.style.minHeight = "";
      html.style.maxHeight = "";
      body.style.maxHeight = "";
      html.style.clipPath = "";
      body.style.clipPath = "";
      html.style.overflowX = "";
      body.style.overflowX = "";
      html.style.overflowY = "";
      body.style.overflowY = "";
    };
  }, []);

  return null;
}
