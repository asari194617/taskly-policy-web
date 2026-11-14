import { renderPolicyMarkdown } from "../lib/markdown";
import type { PolicySlug } from "../lib/policies";
import { policyList } from "../lib/policies";

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
  const { html, headings } = renderPolicyMarkdown(policy.source);
  return (
    <main id="main" className="document-main">
      <nav className="breadcrumbs" aria-label="パンくずリスト">
        <a href="/">ポリシー一覧</a>
        <span aria-hidden="true">/</span>
        <span>{policy.title}</span>
      </nav>
      <div className="document-shell">
        <article className="document">
          <div className="eyebrow">TASKLY POLICY</div>
          <div className="edition-line">
            <span className="edition-pill">{policy.current ? "現行版" : "保存版"}</span>
            <span>版 {policy.version}</span>
            {policy.effectiveDate && <span>施行日 {policy.effectiveDate}</span>}
            {policy.revisionDate && <span>改訂日 {policy.revisionDate}</span>}
          </div>
          <details className="mobile-toc">
            <summary>目次を開く</summary>
            <ol>
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level > 2 ? "toc-nested" : undefined}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ol>
          </details>
          {/* The committed Markdown is hash verified and markdown-it disables embedded HTML. */}
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: The renderer escapes source HTML. */}
          <div className="policy-content" dangerouslySetInnerHTML={{ __html: html }} />
          <section className="document-tools" aria-label="版と形式">
            <h2>この文書の版</h2>
            <p>現行版へのリンクと保存版の URL を使い分けられます。</p>
            <div className="document-links">
              <a href={`/${policy.slug}/`}>現行版</a>
              <a href={`/${policy.slug}/${policy.version}/`}>この版の固定 URL</a>
              <a href={policy.markdownPath}>Markdown で読む</a>
            </div>
            {policy.versions.length > 1 && (
              <ul className="version-list">
                {policy.versions.map((version) => (
                  <li key={version}>
                    <a href={`/${policy.slug}/${version}/`}>{version}</a>
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
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ol>
            <div className="other-policies">
              <h2>ほかの文書</h2>
              {policyList()
                .filter((item) => item.slug !== policy.slug)
                .map((item) => (
                  <a key={item.slug} href={item.htmlPath}>
                    {item.title}
                  </a>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
