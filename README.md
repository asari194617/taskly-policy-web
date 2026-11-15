# Taskly ポリシー

Taskly の利用規約・プライバシーポリシー・セキュリティポリシー・継続性声明を公開する、Next.js 静的サイトです。公開先は `https://policies.taskly.iy0306.com/` です。

- 本文と版管理の出典: [taskly-policy](https://github.com/asari194617/taskly-policy)
- 静的配信: Next.js の共通画面を R2 に置き、Worker が URL を解決します。規約本文と版一覧は R2 の別データとして公開します。
- UI: デジタル庁デザインシステムの[公式トークンとReactコードスニペット](docs/design-system.md)
- 各文書の改定履歴から、前の版との差分を表示できます。表示テーマは端末の設定に従います。
- 開発: Node.js 26.13.1、`npm ci`、`npm run dev`
- 検証: `npm run test:all`

規約の版を追加・切り替えるとき、表示アプリの再ビルドや Worker の再デプロイは不要です。`taskly-policy` の `main` を読み込む `Publish policy data` ワークフローが 15 分ごとに新しいデータを検証・公開します。必要なら同ワークフローを手動実行できます。

本文の更新、公開、監視、保存版の扱いは [docs/operations.md](docs/operations.md) を参照してください。協力方法は [CONTRIBUTING.md](CONTRIBUTING.md)、脆弱性の報告は [SECURITY.md](SECURITY.md) に記載しています。
