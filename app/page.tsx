import { policyList } from "../lib/policies";

const summaries: Record<string, string> = {
  terms: "Taskly の利用条件を定めます。",
  privacy: "個人情報の取扱いを定めます。",
  security: "情報セキュリティに関する基本方針です。",
  continuity: "サービスを継続して提供するための方針です。",
};

export default function Home() {
  const policies = policyList();
  return (
    <main id="main" className="home-main">
      <div className="eyebrow">POLICIES</div>
      <h1>Taskly の規約とポリシー</h1>
      <p className="home-intro">現在公開している文書と、版を固定した保存版を確認できます。</p>
      <nav aria-label="ポリシー一覧">
        <ul className="policy-index">
          {policies.map((policy, index) => (
            <li key={policy.slug}>
              <a href={policy.htmlPath}>
                <span className="index-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="index-copy">
                  <strong>{policy.title}</strong>
                  <span>{summaries[policy.slug]}</span>
                </span>
                <span className="index-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="source-note">
        文書の改定履歴は <a href="https://github.com/asari194617/taskly-policy">taskly-policy</a>{" "}
        で管理しています。
      </p>
    </main>
  );
}
