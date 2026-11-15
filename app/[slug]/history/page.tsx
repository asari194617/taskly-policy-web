import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  Breadcrumbs,
} from "../../../components/dads/Breadcrumbs";
import { Heading, HeadingTitle } from "../../../components/dads/Heading";
import { Link } from "../../../components/dads/Link";
import { getPolicy, isPolicySlug, policyHistory, policySlugs } from "../../../lib/policies";

export function generateStaticParams() {
  return policySlugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return {};
  const policy = getPolicy(slug);
  return { title: `${policy?.title}の改定履歴`, alternates: { canonical: `/${slug}/history/` } };
}

export default async function HistoryPage({ params }: Props) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();
  const policy = getPolicy(slug);
  if (!policy) notFound();
  const history = policyHistory(slug);
  return (
    <main id="main" className="history-main">
      <Breadcrumbs className="breadcrumbs" aria-label="パンくずリスト">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ポリシー一覧</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${slug}/`}>{policy.title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrent>改定履歴</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">{policy.title}の改定履歴</HeadingTitle>
      </Heading>
      <ol className="history-list">
        {history.map((entry) => (
          <li key={entry.version}>
            <div className="history-entry">
              <strong>版 {entry.version}</strong>
              {entry.current && <span className="edition-pill">現行版</span>}
              {entry.date && <time dateTime={entry.date}>{entry.date}</time>}
            </div>
            <div className="history-links">
              <Link href={`/${slug}/${entry.version}/`}>この版を読む</Link>
              {entry.previousVersion && (
                <Link href={`/${slug}/history/${entry.version}/`}>前の版との差分を見る</Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
