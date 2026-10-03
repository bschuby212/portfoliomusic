"use client";

import { useEffect } from "react";

/**
 * Pin the embed document for Framer URL embeds:
 * fixed 420px canvas, no internal scroll, nav stays snapped to top.
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

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    html.style.overflowY = "hidden";
    body.style.overflowY = "hidden";
    html.style.height = "420px";
    body.style.height = "420px";
    html.style.minHeight = "420px";
    body.style.minHeight = "420px";
    html.style.maxHeight = "420px";
    body.style.maxHeight = "420px";
    html.style.clipPath = "none";
    body.style.clipPath = "none";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    // Kill any residual scroll so sticky/fixed never fight the iframe.
    window.scrollTo(0, 0);
    const lockScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", lockScroll, { passive: true, capture: true });

    return () => {
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
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
      window.removeEventListener("scroll", lockScroll, true);
    };
  }, []);

  return null;
}
