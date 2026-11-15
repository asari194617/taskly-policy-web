"use client";

import { useEffect, useState } from "react";
import { Heading, HeadingTitle } from "../../components/dads/Heading";
import { Link } from "../../components/dads/Link";
import type { PolicyRelease } from "../../lib/catalog";
import { useCatalog } from "../../lib/use-catalog";

function releaseLabel(release: PolicyRelease, activeVersion: string | undefined) {
  if (release.status === "upcoming") return "改正予定版";
  return release.version === activeVersion ? "現行版" : "保存版";
}

export default function Versions() {
  const { catalog, error } = useCatalog();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    setSelectedVersion(parts[1] ?? "");
  }, []);

  if (error) {
    return (
      <main id="main" className="history-main">
        <p role="alert">版履歴を読み込めませんでした。ページを再読み込みしてください。</p>
      </main>
    );
  }
  if (!catalog || selectedVersion === null) {
    return (
      <main id="main" className="history-main">
        <p role="status">版履歴を読み込んでいます。</p>
      </main>
    );
  }

  const releases = catalog.releases ?? [];
  const activeVersion = [...releases]
    .reverse()
    .find(
      (release) => release.status === "current" && Date.parse(release.effectiveAt) <= Date.now(),
    )?.version;
  const selected = releases.find((release) => release.version === selectedVersion);
  return (
    <main id="main" className="history-main">
      <nav className="breadcrumbs" aria-label="パンくずリスト">
        <Link href="/">ポリシー一覧</Link>
        {selected && <Link href="/versions/">版履歴</Link>}
      </nav>
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">{selected ? `版 ${selected.version}` : "版履歴"}</HeadingTitle>
      </Heading>
      {selected ? (
        <>
          <p className="release-meta">
            <span className="edition-pill">{releaseLabel(selected, activeVersion)}</span>
            <time dateTime={selected.effectiveAt}>施行日 {selected.effectiveAt.slice(0, 10)}</time>
            <Link
              href={`https://github.com/asari194617/taskly-policy/releases/tag/${selected.version}`}
            >
              GitHub上の版
            </Link>
          </p>
          <ul className="policy-index">
            {selected.policies.map(({ slug, title, revision, changed }) => (
              <li key={slug}>
                <Link href={`/${slug}/${revision}/`}>
                  <span className="index-copy">
                    <strong>{title ?? catalog.documents[slug]?.title ?? slug}</strong>
                    <span>
                      文書の版 {revision}
                      {changed ? " · この公開版で改定" : ""}
                    </span>
                  </span>
                  <span className="index-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ol className="history-list">
          {[...releases].reverse().map((release) => (
            <li key={release.version}>
              <div className="history-entry">
                <strong>版 {release.version}</strong>
                <span className="edition-pill">{releaseLabel(release, activeVersion)}</span>
                <time dateTime={release.effectiveAt}>{release.effectiveAt.slice(0, 10)}</time>
              </div>
              <div className="history-links">
                <Link href={`/versions/${release.version}/`}>この版の文書を見る</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
