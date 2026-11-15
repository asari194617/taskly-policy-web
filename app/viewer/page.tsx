"use client";

import { structuredPatch } from "diff";
import { useEffect, useState } from "react";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  Breadcrumbs,
} from "../../components/dads/Breadcrumbs";
import { Heading, HeadingTitle } from "../../components/dads/Heading";
import { Link } from "../../components/dads/Link";
import { PolicyView } from "../../components/policy-view";
import {
  type Catalog,
  isPolicySlug,
  type PolicySlug,
  policyHistory,
  policyList,
} from "../../lib/catalog";
import { presentationMarkdown } from "../../lib/markdown";
import { useCatalog } from "../../lib/use-catalog";

type Route = {
  slug: PolicySlug;
  kind: "current" | "version" | "history" | "diff";
  version?: string;
};

type Loaded = { source?: string; previousSource?: string };

function parseRoute(pathname: string): Route | null {
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[0];
  if (!slug || !isPolicySlug(slug)) return null;
  if (parts.length === 1) return { slug, kind: "current" };
  if (parts.length === 2 && parts[1] === "history") return { slug, kind: "history" };
  if (parts.length === 2) return { slug, kind: "version", version: parts[1] };
  if (parts.length === 3 && parts[1] === "history") {
    return { slug, kind: "diff", version: parts[2] };
  }
  return null;
}

async function loadMarkdown(slug: PolicySlug, version: string, signal: AbortSignal) {
  const response = await fetch(`/${slug}/${version}.md`, { signal });
  if (!response.ok) throw new Error(`Markdown: HTTP ${response.status}`);
  return response.text();
}

function PolicyHistory({ catalog, slug }: { catalog: Catalog; slug: PolicySlug }) {
  const title = catalog.documents[slug].title;
  return (
    <main id="main" className="history-main">
      <Breadcrumbs className="breadcrumbs" aria-label="パンくずリスト">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ポリシー一覧</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${slug}/`}>{title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrent>改定履歴</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumbs>
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">{title}の改定履歴</HeadingTitle>
      </Heading>
      <ol className="history-list">
        {policyHistory(catalog, slug).map((entry) => (
          <li key={entry.version}>
            <div className="history-entry">
              <strong>版 {entry.version}</strong>
              {entry.current && <span className="edition-pill">現行版</span>}
              {entry.upcoming && <span className="edition-pill">改正予定版</span>}
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

function PolicyDiff({
  catalog,
  slug,
  version,
  source,
  previousSource,
}: {
  catalog: Catalog;
  slug: PolicySlug;
  version: string;
  source: string;
  previousSource: string;
}) {
  const previousVersion = policyHistory(catalog, slug).find(
    (item) => item.version === version,
  )?.previousVersion;
  if (!previousVersion) return null;
  const before = catalog.documents[slug].versions[previousVersion];
  const after = catalog.documents[slug].versions[version];
  const patch = structuredPatch(
    `${slug}/${previousVersion}.md`,
    `${slug}/${version}.md`,
    presentationMarkdown(previousSource, before.revisionDate),
    presentationMarkdown(source, after.revisionDate),
    undefined,
    undefined,
    { context: 3 },
  );
  return (
    <main id="main" className="diff-main">
      <Breadcrumbs className="breadcrumbs" aria-label="パンくずリスト">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ポリシー一覧</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href={`/${slug}/`}>{catalog.documents[slug].title}</BreadcrumbLink>
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
        版 {previousVersion} から版 {version} への変更
      </p>
      <div className="diff-links">
        <Link href={`/${slug}/${previousVersion}/`}>変更前を読む</Link>
        <Link href={`/${slug}/${version}/`}>変更後を読む</Link>
      </div>
      {patch.hunks.length === 0 ? (
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
            {patch.hunks.map((hunk) => {
              let oldLine = hunk.oldStart;
              let newLine = hunk.newStart;
              return (
                <tbody key={`${hunk.oldStart}-${hunk.newStart}`}>
                  <tr className="diff-hunk">
                    <th colSpan={3} scope="rowgroup">
                      {`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`}
                    </th>
                  </tr>
                  {hunk.lines
                    .filter((line) => !line.startsWith("\\"))
                    .map((line) => {
                      const kind =
                        line[0] === "+" ? "added" : line[0] === "-" ? "removed" : "context";
                      const oldNumber = kind === "added" ? null : oldLine++;
                      const newNumber = kind === "removed" ? null : newLine++;
                      return (
                        <tr
                          key={`${kind}-${oldNumber}-${newNumber}-${line}`}
                          className={`diff-${kind}`}
                        >
                          <td className="diff-number">{oldNumber ?? ""}</td>
                          <td className="diff-number">{newNumber ?? ""}</td>
                          <td className="diff-code">
                            <span aria-hidden="true">
                              {kind === "added" ? "+" : kind === "removed" ? "−" : " "}
                            </span>
                            {line.slice(1)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              );
            })}
          </table>
        </section>
      )}
    </main>
  );
}

export default function Viewer() {
  const { catalog, error: catalogError } = useCatalog();
  const [route, setRoute] = useState<Route | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => setRoute(parseRoute(window.location.pathname)), []);
  useEffect(() => {
    if (!catalog || !route) return;
    const title = catalog.documents[route.slug]?.title;
    if (!title) return;
    const pageTitle =
      route.kind === "history"
        ? `${title}の改定履歴`
        : route.kind === "diff"
          ? `${title} ${route.version}の変更`
          : route.kind === "version"
            ? `${title} (${route.version})`
            : title;
    document.title = `${pageTitle} | Taskly ポリシー`;
  }, [catalog, route]);
  useEffect(() => {
    if (!catalog || !route || route.kind === "history") return;
    const controller = new AbortController();
    const version = route.version ?? catalog.current[route.slug];
    const previousVersion =
      route.kind === "diff"
        ? policyHistory(catalog, route.slug).find((item) => item.version === version)
            ?.previousVersion
        : null;
    Promise.all([
      loadMarkdown(route.slug, version, controller.signal),
      previousVersion
        ? loadMarkdown(route.slug, previousVersion, controller.signal)
        : Promise.resolve(undefined),
    ])
      .then(([source, previousSource]) => setLoaded({ source, previousSource }))
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      });
    return () => controller.abort();
  }, [catalog, route]);

  if (catalogError || error)
    return (
      <main id="main" className="document-main">
        <p role="alert">文書を読み込めませんでした。ページを再読み込みしてください。</p>
      </main>
    );
  if (!catalog || !route || (route.kind !== "history" && !loaded)) {
    return (
      <main id="main" className="document-main">
        <p role="status">文書を読み込んでいます。</p>
      </main>
    );
  }
  const { slug } = route;
  const version = route.version ?? catalog.current[slug];
  const edition = catalog.documents[slug].versions[version];
  if (!edition)
    return (
      <main id="main">
        <h1>ページが見つかりません</h1>
      </main>
    );
  if (route.kind === "history") return <PolicyHistory catalog={catalog} slug={slug} />;
  if (route.kind === "diff" && loaded?.source && loaded.previousSource) {
    return (
      <PolicyDiff
        catalog={catalog}
        slug={slug}
        version={version}
        source={loaded.source}
        previousSource={loaded.previousSource}
      />
    );
  }
  if (!loaded?.source) return null;
  return (
    <PolicyView
      policy={{
        slug,
        title: catalog.documents[slug].title,
        version,
        current: version === catalog.current[slug],
        upcoming: Boolean(
          catalog.upcoming?.some((release) =>
            release.policies.some((policy) => policy.slug === slug && policy.revision === version),
          ),
        ),
        effectiveDate: edition.effectiveDate,
        revisionDate: edition.revisionDate,
        markdownPath: `/${slug}/${version}.md`,
        source: loaded.source,
      }}
      history={policyHistory(catalog, slug)}
      otherPolicies={policyList(catalog).filter((item) => item.slug !== slug)}
    />
  );
}
