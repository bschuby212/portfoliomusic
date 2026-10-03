import { PillNav } from "@/components/nav/PillNav";

/**
 * Netlify / Framer iframe embed: only the nav bar (PillNav + music player).
 * Transparent document, no page chrome, overflow visible for the expanded
 * Spotify panel, scrollbars suppressed.
 */
export default function EmbedPage() {
  return <PillNav />;
}
