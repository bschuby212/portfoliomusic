import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-32 pt-10">
      <p className="text-sm text-neutral-500">Portfolio</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-neutral-900">
        A quiet player that stays with you while you look around.
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">
        The glass pill nav holds About, Work, Why I&apos;m looking, home, the
        music player, and contact actions. Play a track, then move around —
        playback should not restart or disappear.
      </p>
      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <Link
          href="/work"
          className="rounded-full bg-neutral-900 px-4 py-2 text-white transition-colors hover:bg-neutral-700"
        >
          View work
        </Link>
        <Link
          href="/about"
          className="rounded-full border border-black/10 px-4 py-2 text-neutral-800 transition-colors hover:bg-white"
        >
          About
        </Link>
        <Link
          href="/looking"
          className="rounded-full border border-black/10 px-4 py-2 text-neutral-800 transition-colors hover:bg-white"
        >
          Why I&apos;m looking
        </Link>
      </div>
      <section className="mt-16 max-w-xl border-t border-black/8 pt-8 text-sm leading-6 text-neutral-500">
        <h2 className="text-neutral-900">Blake&apos;s Playlist</h2>
        <p className="mt-3">
          The player loads a Spotify playlist, shuffles it, and plays 30-second
          previews. After the fourth song, a little surprise kicks in.
        </p>
      </section>
    </main>
  );
}
