"use client";

import { FileDown, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MusicPlayer } from "@/components/music-player/MusicPlayer";
import { usePlayerStore } from "@/components/music-player/store";
import {
  NAV_BRAND,
  NAV_EMAIL,
  NAV_LINKEDIN_URL,
  NAV_LINKS,
  NAV_RESUME_HREF,
} from "./nav-config";
import "./pill-nav.css";

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.84-2.05 3.8-2.05 4.06 0 4.8 2.67 4.8 6.15V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.5V23h-4V8.5z" />
    </svg>
  );
}

type PillNavProps = {
  current?: string;
};

export function PillNav({ current }: PillNavProps) {
  const pathname = usePathname();
  const active = current ?? pathname;
  const player = usePlayerStore();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function copyEmail() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(NAV_EMAIL);
      } else {
        const field = document.createElement("textarea");
        field.value = NAV_EMAIL;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setToast("Email copied");
    } catch {
      setToast(NAV_EMAIL);
    }
  }

  return (
    <div className="pn-root">
      <nav className="pn" aria-label={`${NAV_BRAND} primary`}>
        <Link
          href="/"
          className="pn-avatar"
          aria-label={`${NAV_BRAND} home`}
          title="Home"
          data-home={active === "/"}
        >
          <span className="pn-avatar-mark">BS</span>
        </Link>

        <div className="pn-links">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="pn-link"
              data-active={active === link.href || active.startsWith(`${link.href}/`)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="pn-actions-pill" aria-label="Contact">
        <a
          className="pn-icon-btn"
          href={NAV_LINKEDIN_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Open LinkedIn profile"
        >
          <LinkedInIcon />
        </a>
        <button
          type="button"
          className="pn-icon-btn"
          aria-label={`Copy email ${NAV_EMAIL}`}
          onClick={() => {
            void copyEmail();
          }}
        >
          <Mail size={16} strokeWidth={2} />
        </button>
        <a
          className="pn-icon-btn"
          href={NAV_RESUME_HREF}
          download
          aria-label="Download resume"
        >
          <FileDown size={16} strokeWidth={2} />
        </a>
        <div className="pn-toast" data-open={Boolean(toast)} role="status" aria-live="polite">
          {toast}
        </div>
      </div>

      <div
        className="pn-music"
        data-expanded={player.expanded}
        data-playing={player.isPlaying}
      >
        <MusicPlayer embedded />
      </div>
    </div>
  );
}
