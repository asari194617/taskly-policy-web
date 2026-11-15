import { renderPolicyMarkdown } from "../lib/markdown";
import type { PolicySlug } from "../lib/policies";
import { policyList } from "../lib/policies";
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbList, Breadcrumbs } from "./dads/Breadcrumbs";
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
  versions: string[];
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
          <div className="eyebrow">TASKLY POLICY</div>
          <div className="edition-line">
            <span className="edition-pill">{policy.current ? "現行版" : "保存版"}</span>
            <span>版 {policy.version}</span>
            {policy.effectiveDate && <span>施行日 {policy.effectiveDate}</span>}
            {policy.revisionDate && <span>改訂日 {policy.revisionDate}</span>}
          </div>
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
          <section className="document-tools" aria-label="版と形式">
            <Heading size="18" className="site-heading">
              <HeadingTitle level="h2">この文書の版</HeadingTitle>
            </Heading>
            <p>現行版へのリンクと保存版の URL を使い分けられます。</p>
            <div className="document-links">
              <Link href={`/${policy.slug}/`}>現行版</Link>
              <Link href={`/${policy.slug}/${policy.version}/`}>この版の固定 URL</Link>
              <Link href={policy.markdownPath}>Markdown で読む</Link>
            </div>
            {policy.versions.length > 1 && (
              <ul className="version-list">
                {policy.versions.map((version) => (
                  <li key={version}>
                    <Link href={`/${policy.slug}/${version}/`}>{version}</Link>
                  </li>
                ))}
              </ul>
            )}
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
