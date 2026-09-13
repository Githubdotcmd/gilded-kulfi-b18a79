import SectionPage from "@/components/SectionPage";

export const dynamic = "force-dynamic";

export default async function SectionRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SectionPage slug={slug} />;
}
