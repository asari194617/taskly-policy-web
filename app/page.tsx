"use client";

import { Heading, HeadingTitle } from "../components/dads/Heading";
import { Link } from "../components/dads/Link";
import { policyList } from "../lib/catalog";
import { useCatalog } from "../lib/use-catalog";

const summaries: Record<string, string> = {
  terms: "Tasklyの利用条件を定めます。",
  privacy: "個人情報の取扱いを説明します。",
  security: "情報セキュリティに関する基本方針です。",
  continuity: "サービスを継続して提供するための方針です。",
};

export default function Home() {
  const { catalog, error } = useCatalog();
  return (
    <main id="main" className="home-main">
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">Taskly の規約とポリシー</HeadingTitle>
      </Heading>
      <p className="home-intro">
        Tasklyのサービスに関する文書を掲載しています。適用範囲と施行日は各文書をご確認ください。
      </p>
      {error && (
        <p role="alert">文書一覧を読み込めませんでした。ページを再読み込みしてください。</p>
      )}
      {!catalog && !error && <p role="status">文書一覧を読み込んでいます。</p>}
      {catalog && (
        <nav aria-label="ポリシー一覧">
          <ul className="policy-index">
            {policyList(catalog).map((policy, index) => (
              <li key={policy.slug}>
                <Link href={policy.htmlPath}>
                  <span className="index-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="index-copy">
                    <strong>{policy.title}</strong>
                    <span>
                      {policy.description ?? summaries[policy.slug] ?? "文書の詳細を見る"}
                    </span>
                  </span>
                  <span className="index-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {catalog.releases && (
            <p className="release-history-link">
              <Link href="/versions/">版履歴を見る</Link>
            </p>
          )}
        </nav>
      )}
    </main>
  );
}
