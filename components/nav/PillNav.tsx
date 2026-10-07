"use client";

import { Check, FileDown, Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { MusicPlayer } from "@/components/music-player/MusicPlayer";
import { usePlayerStore } from "@/components/music-player/store";
import {
  NAV_AVATAR_SRC,
  NAV_BRAND,
  NAV_EMAIL,
  NAV_HOME_URL,
  NAV_LINKEDIN_URL,
  NAV_LINKS,
  NAV_RESUME_DOWNLOAD,
  NAV_RESUME_HREF,
} from "./nav-config";
import "./pill-nav.css";

const REEL_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const ICON_SIZE = 16;
const ICON_STROKE = 1.75;

/** Lucide-style stroke mark — matches Mail / FileDown weight. */
function LinkedInIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" rx="0.5" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <span className="pn-icon-face" aria-hidden="true">
      {children}
    </span>
  );
}

function reelForChar(char: string, index: number): string[] {
  if (char === " ") {
    return ["\u00A0", "\u00A0", "\u00A0", "\u00A0"];
  }
  const a = REEL_GLYPHS[(index * 7 + char.charCodeAt(0)) % REEL_GLYPHS.length];
  const b = REEL_GLYPHS[(index * 13 + 11) % REEL_GLYPHS.length];
  return [char, a, b, char];
}

function SlotText({ text }: { text: string }) {
  return (
    <span className="pn-slot" aria-hidden="true">
      {Array.from(text).map((char, index) => {
        const display = char === " " ? "\u00A0" : char;
        return (
          <span
            key={`${char}-${index}`}
            className="pn-slot-char"
            style={{ "--i": index } as CSSProperties}
          >
            <span className="pn-slot-width">{display}</span>
            <span className="pn-slot-reel">
              {reelForChar(char, index).map((glyph, glyphIndex) => (
                <span key={`${glyph}-${glyphIndex}`} className="pn-slot-glyph">
                  {glyph}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

type PillNavProps = {
  current?: string;
};

/** Always-on glass pill nav — no scroll morph. */
export function PillNav({ current }: PillNavProps) {
  const pathname = usePathname();
  const active = current ?? pathname;
  const player = usePlayerStore();
  const [emailCopied, setEmailCopied] = useState(false);

  useEffect(() => {
    if (!emailCopied) return;
    const timer = window.setTimeout(() => setEmailCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [emailCopied]);

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
      setEmailCopied(true);
    } catch {
      setEmailCopied(true);
    }
  }

  return (
    <div
      className="pn-root"
      data-elevate="1"
      data-elevate-ready="true"
      style={{ "--pn-elevate": "1" } as CSSProperties}
    >
      <nav className="pn" aria-label={`${NAV_BRAND} primary`}>
        <a
          href={NAV_HOME_URL}
          className="pn-avatar"
          aria-label={`${NAV_BRAND} home`}
          title="Home"
          data-home={active === "/"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="pn-avatar-img"
            src={NAV_AVATAR_SRC}
            alt=""
            width={32}
            height={32}
            decoding="async"
          />
        </a>

        <div className="pn-links">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="pn-link">
              <span className="pn-sr">{link.label}</span>
              <SlotText text={link.label} />
            </a>
          ))}
        </div>

        <span className="pn-divider" aria-hidden="true" />

        <div className="pn-actions">
          <a
            className="pn-icon-btn pn-fx-spin"
            href={NAV_LINKEDIN_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Open LinkedIn profile"
          >
            <NavIcon>
              <LinkedInIcon />
            </NavIcon>
          </a>
          <button
            type="button"
            className="pn-icon-btn pn-fx-lift"
            data-copied={emailCopied}
            aria-label={
              emailCopied ? "Email copied" : `Copy email ${NAV_EMAIL}`
            }
            onClick={() => {
              void copyEmail();
            }}
          >
            <NavIcon>
              {emailCopied ? (
                <Check
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  absoluteStrokeWidth={false}
                />
              ) : (
                <Mail
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  absoluteStrokeWidth={false}
                />
              )}
            </NavIcon>
          </button>
          <a
            className="pn-icon-btn pn-fx-nudge"
            href={NAV_RESUME_HREF}
            download={NAV_RESUME_DOWNLOAD}
            aria-label={`Download ${NAV_RESUME_DOWNLOAD}`}
          >
            <NavIcon>
              <FileDown size={ICON_SIZE} strokeWidth={ICON_STROKE} absoluteStrokeWidth={false} />
            </NavIcon>
          </a>
        </div>

        <div
          className="pn-toast"
          data-open={emailCopied}
          role="status"
          aria-live="polite"
        >
          <Check size={14} strokeWidth={2.25} absoluteStrokeWidth={false} />
          <span>Email copied</span>
        </div>
      </nav>

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
