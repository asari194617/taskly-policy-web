import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "../components/dads/Link";
import "@digital-go-jp/design-tokens/dist/tokens-simple.css";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://policies.taskly.iy0306.com"),
  title: { default: "Taskly ポリシー", template: "%s | Taskly ポリシー" },
  description: "Taskly の利用規約と各種ポリシーの公開版・保存版。",
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          本文へ移動
        </a>
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="/" aria-label="Taskly ポリシー トップ">
              <Image
                className="brand-logo"
                src="/taskly-logo.svg"
                width={558}
                height={160}
                alt=""
              />
              <span className="brand-secondary">ポリシー</span>
            </a>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-inner">
            <span>© Taskly</span>
            <Link href="https://taskly.iy0306.com/">Taskly に戻る</Link>
            <Link href="https://github.com/asari194617/taskly-policy">GitHub</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
