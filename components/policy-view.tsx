import { renderPolicyMarkdown } from "../lib/markdown";
import type { PolicySlug } from "../lib/policies";
import { policyHistory, policyList } from "../lib/policies";
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbList, Breadcrumbs } from "./dads/Breadcrumbs";
import { Button } from "./dads/Button";
import { Disclosure, DisclosureSummary } from "./dads/Disclosure";
import { Heading, HeadingTitle } from "./dads/Heading";
import { Link } from "./dads/Link";

type Policy = {
  slug: PolicySlug;
  title: string;
  version: string;
  current: boolean;
  effectiveDate?: string | null;
  revisionDate?: string;
  markdownPath: string;
  source: string;
};

export function PolicyView({ policy }: { policy: Policy }) {
  const { html, headings } = renderPolicyMarkdown(policy.source, policy.revisionDate);
  return (
    <main id="main" className="document-main">
      <Breadcrumbs className="breadcrumbs" aria-label="パンくずリスト">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ポリシー一覧</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrent>{policy.title}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>
      <div className="document-shell">
        <article className="document">
          <div className="edition-line">
            <span className="edition-pill">{policy.current ? "現行版" : "保存版"}</span>
            <span>版 {policy.version}</span>
            {policy.effectiveDate && <span>施行日 {policy.effectiveDate}</span>}
            {policy.revisionDate && <span>改訂日 {policy.revisionDate}</span>}
          </div>
          <nav className="document-actions" aria-label="文書のリンク">
            <Button asChild size="sm" variant="outline">
              <a href={`/${policy.slug}/`}>現行版</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/${policy.slug}/${policy.version}/`}>この版の固定 URL</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={policy.markdownPath}>Markdown で読む</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/${policy.slug}/history/`}>改定履歴</a>
            </Button>
          </nav>
          <Disclosure className="mobile-toc">
            <DisclosureSummary>目次を開く</DisclosureSummary>
            <ol>
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level > 2 ? "toc-nested" : undefined}>
                  <Link href={`#${heading.id}`}>{heading.text}</Link>
                </li>
              ))}
            </ol>
          </Disclosure>
          {/* The committed Markdown is hash verified and markdown-it disables embedded HTML. */}
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: The renderer escapes source HTML. */}
          <div className="policy-content" dangerouslySetInnerHTML={{ __html: html }} />
          <section className="document-tools" aria-label="改定履歴">
            <Heading size="18" className="site-heading">
              <HeadingTitle level="h2">改定履歴</HeadingTitle>
            </Heading>
            <ul className="version-list">
              {policyHistory(policy.slug).map((entry) => (
                <li key={entry.version}>
                  <Link href={`/${policy.slug}/${entry.version}/`}>{entry.version}</Link>
                  {entry.current && <span className="edition-pill">現行版</span>}
                  {entry.previousVersion && (
                    <Link href={`/${policy.slug}/history/${entry.version}/`}>前の版との差分</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </article>
        <aside className="document-aside" aria-label="ページ内目次">
          <div className="aside-sticky">
            <h2>目次</h2>
            <ol>
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level > 2 ? "toc-nested" : undefined}>
                  <Link href={`#${heading.id}`}>{heading.text}</Link>
                </li>
              ))}
            </ol>
            <div className="other-policies">
              <h2>ほかの文書</h2>
              {policyList()
                .filter((item) => item.slug !== policy.slug)
                .map((item) => (
                  <Link key={item.slug} href={item.htmlPath}>
                    {item.title}
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
