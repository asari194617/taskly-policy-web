import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyView } from "../../components/policy-view";
import { getPolicy, isPolicySlug, policySlugs } from "../../lib/policies";

export function generateStaticParams() {
  return policySlugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return {};
  const policy = getPolicy(slug);
  return { title: policy?.title, alternates: { canonical: `/${slug}/` } };
}

export default async function CurrentPolicy({ params }: Props) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();
  const policy = getPolicy(slug);
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
