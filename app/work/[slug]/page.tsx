import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";

const studies: Record<
  string,
  { title: string; meta: string; body: string[] }
> = {
  allcampus: {
    title: "All Campus website redesign",
    meta: "Web design · Visual design · 2025",
    body: [
      "All Campus needed a website that could keep up with a growing university partner network. The existing site felt dated and did not match the credibility of the work happening behind it.",
      "The redesign focused on hierarchy, pacing, and a calmer visual system so prospective partners could understand the offering quickly.",
      "Use this page to confirm the music player stays mounted. Scroll, go back to Work, then to About — playback should continue from the same moment.",
    ],
  },
  "vendor-bridge": {
    title: "Vendor Bridge invoicing",
    meta: "SaaS · Interaction design · 2026",
    body: [
      "Vendor Bridge needed a course correction: invoicing workflows had grown dense, and a large healthcare client was losing confidence in the product.",
      "The work simplified the primary paths, clarified invoice status, and brought the interface up to the expectations of a clinical operations team.",
      "This case study exists so you can navigate into a nested route without remounting the global player.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(studies).map((slug) => ({ slug }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = studies[slug];
  if (!study) notFound();

  return (
    <>
      <SiteNav current="/work" />
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-16">
        <Link href="/work" className="text-sm text-neutral-500 hover:text-neutral-900">
          Work
        </Link>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{study.title}</h1>
        <p className="mt-3 text-sm text-neutral-500">{study.meta}</p>
        <div className="mt-10 space-y-5 text-base leading-7 text-neutral-600">
          {study.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
    </>
  );
}
