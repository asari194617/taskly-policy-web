import { Heading, HeadingTitle } from "../components/dads/Heading";
import { Link } from "../components/dads/Link";
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
      <Heading size="36" className="site-heading">
        <HeadingTitle level="h1">Taskly の規約とポリシー</HeadingTitle>
      </Heading>
      <nav aria-label="ポリシー一覧">
        <ul className="policy-index">
          {policies.map((policy, index) => (
            <li key={policy.slug}>
              <Link href={policy.htmlPath}>
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
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
