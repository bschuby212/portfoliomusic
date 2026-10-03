import type { Metadata } from "next";
import { EmbedDocument } from "./EmbedDocument";
import "./embed.css";

export const metadata: Metadata = {
  title: "Blake Nav Embed",
  description: "Transparent PillNav + music player for Framer / iframe embeds.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="embed-shell" data-embed="">
      <EmbedDocument />
      {children}
    </div>
  );
}
