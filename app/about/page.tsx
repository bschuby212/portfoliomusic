import { SiteNav } from "@/components/SiteNav";

export default function AboutPage() {
  return (
    <>
      <SiteNav current="/about" />
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-16">
        <p className="text-sm text-neutral-500">About</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">About</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
          This is a stand-in About page so the player can be tested across
          navigation. The collapsed control should stay in the bottom-right
          corner, including on this route.
        </p>
        <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
          Expand it to change tracks, shuffle the upcoming order, or repeat the
          current song. Collapse it again and keep browsing.
        </p>
      </main>
    </>
  );
}
