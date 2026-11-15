import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  Breadcrumbs,
} from "../../../../components/dads/Breadcrumbs";
import { Heading, HeadingTitle } from "../../../../components/dads/Heading";
import { Link } from "../../../../components/dads/Link";
import { allPolicyVersions, getPolicy, isPolicySlug } from "../../../../lib/policies";
import { getPolicyDiff } from "../../../../lib/policy-diff";

export function generateStaticParams() {
  return allPolicyVersions().filter(({ slug, version }) => getPolicyDiff(slug, version));
}

type Props = { params: Promise<{ slug: string; version: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, version } = await params;
  if (!isPolicySlug(slug)) return {};
  const policy = getPolicy(slug, version);
  return {
    title: policy ? `${policy.title} ${version}の変更` : undefined,
    alternates: { canonical: `/${slug}/history/${version}/` },
  };
}

export default async function DiffPage({ params }: Props) {
  const { slug, version } = await params;
  if (!isPolicySlug(slug)) notFound();
  const diff = getPolicyDiff(slug, version);
  if (!diff) notFound();
  return (
    <main id="main" className="diff-main">
      <Breadcrumbs className="breadcrumbs" aria-label="パンくずリスト">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ポリシー一覧</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${slug}/`}>{diff.after.title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${slug}/history/`}>改定履歴</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrent>版 {version} の変更</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">版 {version} の変更</HeadingTitle>
      </Heading>
      <p className="diff-summary">
        版 {diff.before.version} から版 {diff.after.version} への変更
      </p>
      <div className="diff-links">
        <Link href={`/${slug}/${diff.before.version}/`}>変更前を読む</Link>
        <Link href={`/${slug}/${diff.after.version}/`}>変更後を読む</Link>
      </div>
      {diff.hunks.length === 0 ? (
        <p>本文に変更はありません。</p>
      ) : (
        <section className="diff-scroll" aria-label="Markdown の変更差分">
          <table className="diff-table">
            <caption>Markdown の変更行（− は削除、+ は追加）</caption>
            <colgroup>
              <col className="diff-line-column" />
              <col className="diff-line-column" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">変更前</th>
                <th scope="col">変更後</th>
                <th scope="col">内容</th>
              </tr>
            </thead>
            {diff.hunks.map((hunk) => (
              <tbody key={hunk.header}>
                <tr className="diff-hunk">
                  <th colSpan={3} scope="rowgroup">
                    {hunk.header}
                  </th>
                </tr>
                {hunk.lines.map((line) => (
                  <tr
                    key={`${hunk.header}-${line.kind}-${line.oldLine}-${line.newLine}`}
                    className={`diff-${line.kind}`}
                  >
                    <td className="diff-number">{line.oldLine ?? ""}</td>
                    <td className="diff-number">{line.newLine ?? ""}</td>
                    <td className="diff-code">
                      <span aria-hidden="true">
                        {line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}
                      </span>
                      {line.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </section>
      )}
    </main>
  );
}
