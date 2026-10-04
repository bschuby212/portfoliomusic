import { PillNav } from "@/components/nav/PillNav";

/**
 * Netlify / Framer iframe embed: short ~72px bar.
 * Parent uses a FIXED overlay that grows on expand — page does not reflow.
 */
export default function EmbedPage() {
  return <PillNav />;
}
