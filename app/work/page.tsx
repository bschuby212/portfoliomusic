import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const studies = [
  {
    slug: "allcampus",
    title: "All Campus website redesign",
    meta: "Web design · 2025",
    summary: "A modern, credible site for a growing university partner network.",
  },
  {
    slug: "vendor-bridge",
    title: "Vendor Bridge invoicing",
    meta: "SaaS · 2026",
    summary: "A course correction of a healthcare invoicing platform.",
  },
];

export default function WorkPage() {
  return (
    <>
      <SiteNav current="/work" />
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-16">
        <p className="text-sm text-neutral-500">Work</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Selected work</h1>
        <p className="mt-4 max-w-xl text-neutral-600">
          Open a case study while music is playing. The player should keep its
          place in the corner, and the song should not skip a beat.
        </p>
        <ul className="mt-12 space-y-4">
          {studies.map((study) => (
            <li key={study.slug}>
              <Link
                href={`/work/${study.slug}`}
                className="block rounded-2xl border border-black/8 bg-white px-5 py-5 transition-colors hover:border-black/15"
              >
                <p className="text-xs text-neutral-500">{study.meta}</p>
                <h2 className="mt-1 text-lg font-medium tracking-tight">{study.title}</h2>
                <p className="mt-1 text-sm text-neutral-600">{study.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
