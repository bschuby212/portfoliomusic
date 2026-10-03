"use client";

import { useEffect } from "react";

/**
 * Force the document itself to allow overflow when /embed is iframed.
 * Nested layouts can't set <html> attributes, so we do it on mount.
 */
export function EmbedDocument() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.dataset.embed = "";
    body.dataset.embed = "";

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;

    html.style.overflow = "visible";
    html.style.overflowX = "visible";
    html.style.overflowY = "visible";
    body.style.overflow = "visible";
    body.style.overflowX = "visible";
    body.style.overflowY = "visible";
    html.style.clipPath = "none";
    body.style.clipPath = "none";
    // Framer URL embeds clip to the iframe box — keep a tall canvas ready.
    html.style.minHeight = "420px";
    body.style.minHeight = "420px";

    return () => {
      delete html.dataset.embed;
      delete body.dataset.embed;
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflowX = prevBodyOverflowX;
      html.style.clipPath = "";
      body.style.clipPath = "";
    };
  }, []);

  return null;
}
