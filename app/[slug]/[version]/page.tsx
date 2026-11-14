import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyView } from "../../../components/policy-view";
import { allPolicyVersions, getPolicy, isPolicySlug } from "../../../lib/policies";

export function generateStaticParams() {
  return allPolicyVersions();
}

type Props = { params: Promise<{ slug: string; version: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, version } = await params;
  if (!isPolicySlug(slug)) return {};
  const policy = getPolicy(slug, version);
  return {
    title: policy ? `${policy.title} (${version})` : undefined,
    alternates: { canonical: `/${slug}/${version}/` },
  };
}

export default async function VersionedPolicy({ params }: Props) {
  const { slug, version } = await params;
  if (!isPolicySlug(slug)) notFound();
  const policy = getPolicy(slug, version);
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
