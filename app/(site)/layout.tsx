import { PillNav } from "@/components/nav/PillNav";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-chrome min-h-dvh" data-site="">
      <PillNav />
      {children}
    </div>
  );
}
