"use client";

import { FileDown, Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
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
  NAV_RESUME_HREF,
} from "./nav-config";
import "./pill-nav.css";

const REEL_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/** Scroll range where the glass shell materializes around the nav. */
const ELEVATE_START_PX = 60;
const ELEVATE_END_PX = 120;

function elevateFromScrollY(scrollY: number): number {
  if (scrollY <= ELEVATE_START_PX) return 0;
  if (scrollY >= ELEVATE_END_PX) return 1;
  const t = (scrollY - ELEVATE_START_PX) / (ELEVATE_END_PX - ELEVATE_START_PX);
  // Subtle ease-out so the glass settles in softly.
  return 1 - (1 - t) ** 2.2;
}

let elevateCache = 0

function subscribeElevate(onStoreChange: () => void) {
  let frame = 0;
  const publish = () => {
    const next =
      Math.round(
        elevateFromScrollY(window.scrollY || window.pageYOffset || 0) * 100,
      ) / 100;
    if (next === elevateCache) return;
    elevateCache = next;
    onStoreChange();
  };
  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      publish();
    });
  };
  publish();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}

function getElevateSnapshot() {
  return elevateCache;
}

function getElevateServerSnapshot() {
  return 0;
}

function useNavElevate() {
  const elevate = useSyncExternalStore(
    subscribeElevate,
    getElevateSnapshot,
    getElevateServerSnapshot,
  );
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return { elevate, ready };
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.84-2.05 3.8-2.05 4.06 0 4.8 2.67 4.8 6.15V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.5V23h-4V8.5z" />
    </svg>
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

export function PillNav({ current }: PillNavProps) {
  const pathname = usePathname();
  const active = current ?? pathname;
  const player = usePlayerStore();
  const [toast, setToast] = useState<string | null>(null);
  const { elevate, ready } = useNavElevate();

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

  const elevated = elevate >= 0.5;

  return (
    <div
      className="pn-root"
      data-elevate={elevated ? "1" : "0"}
      data-elevate-ready={ready ? "true" : "false"}
      style={{ "--pn-elevate": String(elevate) } as CSSProperties}
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
          <img className="pn-avatar-img" src={NAV_AVATAR_SRC} alt="" width={43} height={43} />
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
            <span className="pn-icon-face" aria-hidden="true">
              <LinkedInIcon />
            </span>
          </a>
          <button
            type="button"
            className="pn-icon-btn pn-fx-lift"
            aria-label={`Copy email ${NAV_EMAIL}`}
            onClick={() => {
              void copyEmail();
            }}
          >
            <span className="pn-icon-face" aria-hidden="true">
              <Mail size={16} strokeWidth={2} />
            </span>
          </button>
          <a
            className="pn-icon-btn pn-fx-nudge"
            href={NAV_RESUME_HREF}
            download
            aria-label="Download resume"
          >
            <span className="pn-icon-face" aria-hidden="true">
              <FileDown size={16} strokeWidth={2} />
            </span>
          </a>
        </div>

        <div className="pn-toast" data-open={Boolean(toast)} role="status" aria-live="polite">
          {toast}
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
