"use client";

import { FileDown, Mail } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { MusicPlayer } from "@/components/music-player/MusicPlayer";
import { usePlayerStore } from "@/components/music-player/store";
import {
  NAV_AVATAR_SRC,
  NAV_BRAND,
  NAV_EMAIL,
  NAV_EMAIL_HREF,
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

/** Longer range + smoother curve so text → glass doesn’t snap. */
const ELEVATE_START_PX = 36;
const ELEVATE_END_PX = 168;

function elevateFromScrollY(scrollY: number): number {
  if (scrollY <= ELEVATE_START_PX) return 0;
  if (scrollY >= ELEVATE_END_PX) return 1;
  const t = (scrollY - ELEVATE_START_PX) / (ELEVATE_END_PX - ELEVATE_START_PX);
  // Smoothstep then gentle ease-out — glass fades in without a hard kick.
  const s = t * t * (3 - 2 * t);
  return 1 - (1 - s) ** 1.35;
}

let elevateCache = 0;

function readScrollY(target: EventTarget | null = null): number {
  let y = Math.max(
    window.scrollY || window.pageYOffset || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
    document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement.scrollTop
      : 0,
  );

  let node: Element | null =
    target instanceof Element
      ? target
      : target instanceof Document
        ? target.documentElement
        : null;
  while (node) {
    if (node instanceof HTMLElement && node.scrollTop > y) y = node.scrollTop;
    node = node.parentElement;
  }

  return y;
}

function subscribeElevate(onStoreChange: () => void) {
  let frame = 0;
  let lastTarget: EventTarget | null = null;
  const publish = (target: EventTarget | null = lastTarget) => {
    lastTarget = target;
    const next = Math.round(elevateFromScrollY(readScrollY(target)) * 1000) / 1000;
    if (next === elevateCache) return;
    elevateCache = next;
    onStoreChange();
  };
  const onScroll = (event?: Event) => {
    if (frame) return;
    const target = event?.target ?? null;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      publish(target);
    });
  };
  publish();
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("resize", onScroll, { passive: true });
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("scroll", onScroll, true);
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

export function PillNav({ current }: PillNavProps) {
  const pathname = usePathname();
  const active = current ?? pathname;
  const player = usePlayerStore();
  const { elevate, ready } = useNavElevate();

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
          <img
            className="pn-avatar-img"
            src={NAV_AVATAR_SRC}
            alt=""
            width={64}
            height={64}
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
          <a
            className="pn-icon-btn pn-fx-lift"
            href={NAV_EMAIL_HREF}
            aria-label={`Email ${NAV_EMAIL}`}
          >
            <NavIcon>
              <Mail size={ICON_SIZE} strokeWidth={ICON_STROKE} absoluteStrokeWidth={false} />
            </NavIcon>
          </a>
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
