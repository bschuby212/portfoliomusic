"use client";

import { useEffect } from "react";

/**
 * Fixed-top Framer embed: allow overflow so the expanded music panel can overfill.
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
    html.style.minHeight = "0";
    body.style.minHeight = "0";
    html.style.maxHeight = "none";
    body.style.maxHeight = "none";
    html.style.clipPath = "none";
    body.style.clipPath = "none";

    return () => {
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
