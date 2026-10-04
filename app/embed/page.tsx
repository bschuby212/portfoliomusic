import { PillNav } from "@/components/nav/PillNav";

/**
 * Netlify / Framer iframe embed: document stays 72px (no Framer scale-crush).
 * Parent FIXED overlay grows on expand — page does not reflow.
 */
export default function EmbedPage() {
  return <PillNav />;
}
