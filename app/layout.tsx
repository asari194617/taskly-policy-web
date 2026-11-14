import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeToggle } from "../components/theme-toggle";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://policies.taskly.iy0306.com"),
  title: { default: "Taskly ポリシー", template: "%s | Taskly ポリシー" },
  description: "Taskly の利用規約と各種ポリシーの公開版・保存版。",
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script src="/theme-init.js" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          本文へ移動
        </a>
        <header className="site-header">
          <div className="header-inner">
            <a className="brand" href="/" aria-label="Taskly ポリシー トップ">
              <span className="brand-mark" aria-hidden="true">
                T
              </span>
              <span>
                Taskly <span className="brand-secondary">ポリシー</span>
              </span>
            </a>
            <ThemeToggle />
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-inner">
            <span>© Taskly</span>
            <a href="https://taskly.iy0306.com/">Taskly に戻る</a>
            <a href="https://github.com/asari194617/taskly-policy">原文と版管理</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
